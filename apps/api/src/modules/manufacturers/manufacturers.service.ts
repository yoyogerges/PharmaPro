import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PaginatedData } from '@pharmapro/shared';
import { getPagination, getSort, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateManufacturerDto, UpdateManufacturerDto } from './dto/manufacturer.dto';

const include = { _count: { select: { products: true } } } satisfies Prisma.ManufacturerInclude;
const listInclude = { _count: { select: { products: { where: { deletedAt: null } } } } } satisfies Prisma.ManufacturerInclude;

export interface ManufacturerListItem {
  id: string;
  name: string;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  notes?: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
}

@Injectable()
export class ManufacturersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: PaginationQuery): Promise<PaginatedData<ManufacturerListItem>> {
    const { skip, take } = getPagination(query);
    const where: Prisma.ManufacturerWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { country: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.manufacturer.count({ where }),
      this.prisma.manufacturer.findMany({ where, skip, take, orderBy: getSort(query) ?? { name: 'asc' }, include: listInclude }),
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
    return this.prisma.manufacturer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, country: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<ManufacturerListItem> {
    const row = await this.prisma.manufacturer.findUnique({ where: { id }, include: listInclude });
    if (!row) throw new NotFoundException('Manufacturer not found');
    return this.toListItem(row);
  }

  async create(dto: CreateManufacturerDto, request?: Request): Promise<ManufacturerListItem> {
    const dup = await this.prisma.manufacturer.findFirst({ where: { name: dto.name } });
    if (dup) throw new ConflictException('Manufacturer name already exists');

    const row = await this.prisma.manufacturer.create({ data: dto });

    void this.auditService.log({
      action: 'manufacturers.create',
      entityType: 'Manufacturer',
      entityId: row.id,
      newValue: { name: row.name },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.findOne(row.id);
  }

  async update(id: string, dto: UpdateManufacturerDto, request?: Request): Promise<ManufacturerListItem> {
    const existing = await this.prisma.manufacturer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Manufacturer not found');

    const row = await this.prisma.manufacturer.update({ where: { id }, data: dto });

    void this.auditService.log({
      action: 'manufacturers.update',
      entityType: 'Manufacturer',
      entityId: id,
      previousValue: { name: existing.name },
      newValue: { name: row.name, isActive: row.isActive },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.findOne(id);
  }

  async remove(id: string, request?: Request): Promise<{ success: boolean }> {
    const existing = await this.prisma.manufacturer.findUnique({ where: { id }, include });
    if (!existing) throw new NotFoundException('Manufacturer not found');
    if (existing._count.products > 0) {
      throw new BadRequestException('Manufacturer has products and cannot be deleted');
    }

    await this.prisma.manufacturer.delete({ where: { id } });

    void this.auditService.log({
      action: 'manufacturers.delete',
      entityType: 'Manufacturer',
      entityId: id,
      previousValue: { name: existing.name },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return { success: true };
  }

  private toListItem(row: Prisma.ManufacturerGetPayload<{ include: typeof include }>): ManufacturerListItem {
    return {
      id: row.id,
      name: row.name,
      country: row.country,
      phone: row.phone,
      email: row.email,
      website: row.website,
      notes: row.notes,
      isActive: row.isActive,
      productCount: row._count.products,
      createdAt: row.createdAt,
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}