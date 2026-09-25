import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Role } from '@prisma/client';
import type { PaginatedData } from '@pharmapro/shared';
import { getPagination, getSort, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

const roleInclude = {
  rolePermissions: { include: { permission: true } },
  _count: { select: { userRoles: true } },
} satisfies Prisma.RoleInclude;

export interface RoleListItem {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: Date;
}

export interface RoleDetail extends RoleListItem {
  permissions: string[];
}

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: PaginationQuery): Promise<PaginatedData<RoleListItem>> {
    const { skip, take } = getPagination(query);
    const where: Prisma.RoleWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { displayName: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, roles] = await this.prisma.$transaction([
      this.prisma.role.count({ where }),
      this.prisma.role.findMany({
        where,
        skip,
        take,
        orderBy: getSort(query) ?? { createdAt: 'asc' },
        include: roleInclude,
      }),
    ]);

    return {
      items: roles.map((role) => this.toListItem(role)),
      meta: {
        page: Number(query.page) || 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
        hasNextPage: (Number(query.page) || 1) * take < total,
        hasPrevPage: (Number(query.page) || 1) > 1,
      },
    };
  }

  async findAllNames() {
    return this.prisma.role.findMany({
      select: { id: true, name: true, displayName: true, isSystem: true, description: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPermissionIds() {
    const rows = await this.prisma.permission.findMany({
      select: { id: true, module: true, action: true, displayName: true },
      orderBy: { module: 'asc' },
    });
    return rows.map((p) => ({ ...p, key: `${p.module}.${p.action}` }));
  }

  async findOne(id: string): Promise<RoleDetail> {
    const role = await this.prisma.role.findUnique({ where: { id }, include: roleInclude });
    if (!role) throw new NotFoundException('Role not found');
    return this.toDetail(role);
  }

  async create(dto: CreateRoleDto, request?: Request): Promise<RoleDetail> {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Role name already exists');

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        rolePermissions: dto.permissionIds?.length
          ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
      include: roleInclude,
    });

    void this.auditService.log({
      action: 'roles.create',
      entityType: 'Role',
      entityId: role.id,
      newValue: { name: role.name, permissions: dto.permissionIds },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(role);
  }

  async update(id: string, dto: UpdateRoleDto, request?: Request): Promise<RoleDetail> {
    const existing = await this.prisma.role.findUnique({ where: { id }, include: roleInclude });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    const role = await this.prisma.role.update({
      where: { id },
data: {
        displayName: dto.displayName,
        description: dto.description,
        rolePermissions:
          dto.permissionIds !== undefined
            ? {
                deleteMany: {},
                create: dto.permissionIds.map((permissionId) => ({ permissionId })),
              }
            : undefined,
      },
      include: roleInclude,
    });

    void this.auditService.log({
      action: 'roles.update',
      entityType: 'Role',
      entityId: id,
      previousValue: { displayName: existing.displayName },
      newValue: { displayName: role.displayName, permissions: dto.permissionIds },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(role);
  }

  async remove(id: string, request?: Request): Promise<{ success: boolean }> {
    const existing = await this.prisma.role.findUnique({ where: { id }, include: roleInclude });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem) throw new BadRequestException('System roles cannot be deleted');
    if (existing._count.userRoles > 0) {
      throw new BadRequestException('Role is assigned to users and cannot be deleted');
    }

    await this.prisma.role.delete({ where: { id } });

    void this.auditService.log({
      action: 'roles.delete',
      entityType: 'Role',
      entityId: id,
      previousValue: { name: existing.name },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return { success: true };
  }

  private toListItem(role: Prisma.RoleGetPayload<{ include: typeof roleInclude }>): RoleListItem {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.userRoles,
      permissionCount: role.rolePermissions.length,
      createdAt: role.createdAt,
    };
  }

  private toDetail(role: Prisma.RoleGetPayload<{ include: typeof roleInclude }>): RoleDetail {
    return {
      ...this.toListItem(role),
      permissions: role.rolePermissions.map((rp) => `${rp.permission.module}.${rp.permission.action}`),
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}