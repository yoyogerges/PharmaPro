import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ProductCategory } from '@prisma/client';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

export interface CategoryTreeNode {
  id: string;
  parentId?: string | null;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  children: CategoryTreeNode[];
}

export interface CategoryListItem {
  id: string;
  name: string;
  nameAr?: string | null;
  parentId?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(): Promise<CategoryTreeNode[]> {
    const categories = await this.prisma.productCategory.findMany({
      include: { _count: { select: { products: { where: { deletedAt: null } } } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return this.buildTree(categories);
  }

  async findAllNames() {
    return this.prisma.productCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true, nameAr: true, parentId: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<CategoryListItem> {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      include: { _count: { select: { products: { where: { deletedAt: null } } } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return {
      id: category.id,
      name: category.name,
      nameAr: category.nameAr,
      parentId: category.parentId,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      productCount: category._count.products,
      createdAt: category.createdAt,
    };
  }

  async create(dto: CreateCategoryDto, request?: Request): Promise<CategoryListItem> {
    if (dto.parentId) {
      const parent = await this.prisma.productCategory.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('Parent category not found');
    }

    const dup = await this.prisma.productCategory.findFirst({ where: { name: dto.name } });
    if (dup) throw new ConflictException('Category name already exists');

    const category = await this.prisma.productCategory.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        parentId: dto.parentId,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    void this.auditService.log({
      action: 'categories.create',
      entityType: 'ProductCategory',
      entityId: category.id,
      newValue: { name: category.name, parentId: category.parentId },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.findOne(category.id);
  }

  async update(id: string, dto: UpdateCategoryDto, request?: Request): Promise<CategoryListItem> {
    const existing = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    if (dto.parentId) {
      if (dto.parentId === id) throw new BadRequestException('Category cannot be its own parent');
      const parent = await this.prisma.productCategory.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('Parent category not found');
      const cycle = await this.isDescendant(id, dto.parentId);
      if (cycle) throw new BadRequestException('Cannot move a category under one of its own children');
    }

    const category = await this.prisma.productCategory.update({
      where: { id },
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        parentId: dto.parentId,
        description: dto.description,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });

    void this.auditService.log({
      action: 'categories.update',
      entityType: 'ProductCategory',
      entityId: id,
      previousValue: { name: existing.name },
      newValue: { name: category.name },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.findOne(id);
  }

  async remove(id: string, request?: Request): Promise<{ success: boolean }> {
    const existing = await this.prisma.productCategory.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!existing) throw new NotFoundException('Category not found');
    if (existing._count.products > 0) {
      throw new BadRequestException('Category has products and cannot be deleted');
    }
    if (existing._count.children > 0) {
      throw new BadRequestException('Category has sub-categories and cannot be deleted');
    }

    await this.prisma.productCategory.delete({ where: { id } });

    void this.auditService.log({
      action: 'categories.delete',
      entityType: 'ProductCategory',
      entityId: id,
      previousValue: { name: existing.name },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return { success: true };
  }

  private buildTree(rows: Array<ProductCategory & { _count: { products: number } }>): CategoryTreeNode[] {
    const map = new Map<string, CategoryTreeNode>();
    for (const row of rows) {
      map.set(row.id, {
        id: row.id,
        parentId: row.parentId,
        name: row.name,
        nameAr: row.nameAr,
        description: row.description,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        productCount: row._count.products,
        children: [],
      });
    }
    const roots: CategoryTreeNode[] = [];
    for (const row of rows) {
      const node = map.get(row.id)!;
      if (row.parentId && map.has(row.parentId)) {
        map.get(row.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  private async isDescendant(ancestorId: string, candidateId: string): Promise<boolean> {
    let current = candidateId;
    for (let depth = 0; depth < 10; depth++) {
      const row = await this.prisma.productCategory.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
      if (!row) return false;
      if (row.parentId === ancestorId) return true;
      if (!row.parentId) return false;
      current = row.parentId;
    }
    return false;
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}