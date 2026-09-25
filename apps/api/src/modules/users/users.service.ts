import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, User, UserStatus } from '@prisma/client';
import type { PaginatedData } from '@pharmapro/shared';
import { getPagination, getSort, type PaginationQuery } from '@pharmapro/shared';
import * as argon2 from 'argon2';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const userInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  },
  employee: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.UserInclude;

export interface UserListItem {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: UserStatus;
  lastLoginAt?: Date | null;
  createdAt: Date;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: PaginationQuery): Promise<PaginatedData<UserListItem>> {
    const { skip, take } = getPagination(query);
    const where: Prisma.UserWhereInput = query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' } },
            { username: { contains: query.search, mode: 'insensitive' } },
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
          ],
        }
      : {};

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: getSort(query) ?? { createdAt: 'desc' },
        include: userInclude,
      }),
    ]);

    return {
      items: users.map((user) => this.toListItem(user)),
      meta: {
        page: Number(query.page) || 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
        hasNextPage: Number(query.page || 1) * take < total,
        hasPrevPage: (Number(query.page) || 1) > 1,
      },
    };
  }

  async findOne(id: string): Promise<UserListItem> {
    const user = await this.prisma.user.findUnique({ where: { id }, include: userInclude });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');
    return this.toListItem(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async create(dto: CreateUserDto, request?: Request): Promise<UserListItem> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException(existing.email === email ? 'Email already in use' : 'Username already in use');
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: {
        email,
        username: dto.username,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: dto.status ?? 'ACTIVE',
        userRoles: dto.roleIds?.length
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      include: userInclude,
    });

    void this.auditService.log({
      action: 'users.create',
      entityType: 'User',
      entityId: user.id,
      newValue: { email: user.email, roles: dto.roleIds },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toListItem(user);
  }

  async update(id: string, dto: UpdateUserDto, request?: Request): Promise<UserListItem> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    if (dto.email || dto.username) {
      const dup = await this.prisma.user.findFirst({
        where: {
          NOT: { id },
          OR: [
            ...(dto.email ? [{ email: dto.email.toLowerCase() }] : []),
            ...(dto.username ? [{ username: dto.username }] : []),
          ],
        },
      });
      if (dup) throw new ConflictException('Email or username already in use');
    }

    const passwordHash = dto.password ? await argon2.hash(dto.password, { type: argon2.argon2id }) : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email?.toLowerCase(),
        username: dto.username,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: dto.status,
        passwordHash,
        userRoles:
          dto.roleIds !== undefined
            ? {
                deleteMany: {},
                create: dto.roleIds.map((roleId) => ({ roleId })),
              }
            : undefined,
      },
      include: userInclude,
    });

    void this.auditService.log({
      action: 'users.update',
      entityType: 'User',
      entityId: id,
      previousValue: { email: existing.email, status: existing.status },
      newValue: { email: user.email, status: user.status },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toListItem(user);
  }

  async remove(id: string, request?: Request): Promise<{ success: boolean }> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });

    void this.auditService.log({
      action: 'users.delete',
      entityType: 'User',
      entityId: id,
      previousValue: { email: existing.email },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return { success: true };
  }

  private toListItem(user: Prisma.UserGetPayload<{ include: typeof userInclude }>): UserListItem {
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => `${rp.permission.module}.${rp.permission.action}`),
        ),
      ),
    );
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles,
      permissions,
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}