import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PaginatedData } from '@pharmapro/shared';
import { getPagination, getSort, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto, LinkUserDto } from './dto/employee.dto';

const include = {
  user: { select: { id: true, username: true, email: true, status: true } },
} satisfies Prisma.EmployeeInclude;

export interface EmployeeListItem {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  department?: string | null;
  joiningDate?: Date | null;
  salary?: number | null;
  isActive: boolean;
  createdAt: Date;
  user?: { id: string; username: string; email: string; status: string } | null;
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: PaginationQuery): Promise<PaginatedData<EmployeeListItem>> {
    const { skip, take } = getPagination(query);
    const where: Prisma.EmployeeWhereInput = query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
            { position: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({ where, skip, take, orderBy: getSort(query) ?? { firstName: 'asc' }, include }),
    ]);

    return {
      items: rows.map((row) => this.toListItem(row)),
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
    return this.prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true, position: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async findOne(id: string): Promise<EmployeeListItem> {
    const row = await this.prisma.employee.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Employee not found');
    return this.toListItem(row);
  }

  async create(dto: CreateEmployeeDto, request?: Request): Promise<EmployeeListItem> {
    const row = await this.prisma.employee.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        position: dto.position,
        department: dto.department,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        salary: dto.salary,
      },
      include,
    });

    void this.auditService.log({
      action: 'employees.create',
      entityType: 'Employee',
      entityId: row.id,
      newValue: { name: `${row.firstName} ${row.lastName}` },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toListItem(row);
  }

  async update(id: string, dto: UpdateEmployeeDto, request?: Request): Promise<EmployeeListItem> {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Employee not found');

    const row = await this.prisma.employee.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        position: dto.position,
        department: dto.department,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        salary: dto.salary,
        isActive: dto.isActive,
      },
      include,
    });

    void this.auditService.log({
      action: 'employees.update',
      entityType: 'Employee',
      entityId: id,
      previousValue: { name: `${existing.firstName} ${existing.lastName}` },
      newValue: { name: `${row.firstName} ${row.lastName}`, isActive: row.isActive },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toListItem(row);
  }

  async remove(id: string, request?: Request): Promise<{ success: boolean }> {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Employee not found');
    if (existing.userId) {
      throw new NotFoundException('Employee is linked to a user account and cannot be deleted');
    }

    await this.prisma.employee.delete({ where: { id } });

    void this.auditService.log({
      action: 'employees.delete',
      entityType: 'Employee',
      entityId: id,
      previousValue: { name: `${existing.firstName} ${existing.lastName}` },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return { success: true };
  }

  async linkUser(id: string, dto: LinkUserDto, request?: Request): Promise<EmployeeListItem> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');

    if (dto.unlink) {
      const row = await this.prisma.employee.update({ where: { id }, data: { userId: null }, include });

      void this.auditService.log({
        action: 'employees.link-user',
        entityType: 'Employee',
        entityId: id,
        previousValue: { linkedUserId: employee.userId },
        newValue: { linkedUserId: null },
        userId: this.currentUserId(request),
        ipAddress: request?.ip ?? undefined,
        userAgent: request?.headers?.['user-agent'] ?? undefined,
      });

      return this.toListItem(row);
    }

    if (!dto.userId) throw new BadRequestException('userId is required to link a user account');

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    const alreadyLinked = await this.prisma.employee.findFirst({ where: { userId: user.id, id: { not: id } } });
    if (alreadyLinked) {
      throw new ConflictException('This user is already linked to another employee');
    }

    const row = await this.prisma.employee.update({ where: { id }, data: { userId: user.id }, include });

    void this.auditService.log({
      action: 'employees.link-user',
      entityType: 'Employee',
      entityId: id,
      previousValue: { linkedUserId: employee.userId },
      newValue: { linkedUserId: user.id },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toListItem(row);
  }

  private toListItem(row: Prisma.EmployeeGetPayload<{ include: typeof include }>): EmployeeListItem {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      email: row.email,
      position: row.position,
      department: row.department,
      joiningDate: row.joiningDate,
      salary: row.salary ? row.salary.toNumber() : null,
      isActive: row.isActive,
      createdAt: row.createdAt,
      user: row.user,
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}