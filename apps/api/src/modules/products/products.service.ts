import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PaginatedData } from '@pharmapro/shared';
import { getPagination, getSort, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { rowsToCsv, type CsvColumn } from '../../common/utils/csv';

const listInclude = {
  category: { select: { id: true, name: true, nameAr: true } },
  manufacturer: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

const detailInclude = {
  category: { select: { id: true, name: true, nameAr: true } },
  manufacturer: { select: { id: true, name: true } },
  ingredients: { select: { id: true, ingredientName: true, strength: true, unit: true } },
  _count: { select: { batches: true } },
} satisfies Prisma.ProductInclude;

export interface ProductListItem {
  id: string;
  name: string;
  nameAr?: string | null;
  brandName?: string | null;
  barcode?: string | null;
  sku?: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  taxRate: number;
  reorderLevel: number;
  prescriptionRequired: boolean;
  isActive: boolean;
  stockQuantity: number;
  category?: { id: string; name: string; nameAr?: string | null } | null;
  manufacturer?: { id: string; name: string } | null;
}

export interface ProductDetail extends Omit<ProductListItem, 'category' | 'manufacturer'> {
  genericName?: string | null;
  categoryId?: string | null;
  manufacturerId?: string | null;
  dosageForm?: string | null;
  strength?: string | null;
  packageSize?: string | null;
  minSellingPrice?: number | null;
  description?: string | null;
  descriptionAr?: string | null;
  storageInstructions?: string | null;
  deletedAt?: Date | null;
  stockQuantity: number;
  batchCount: number;
  category?: { id: string; name: string; nameAr?: string | null } | null;
  manufacturer?: { id: string; name: string } | null;
  ingredients: Array<{ id: string; ingredientName: string; strength?: string | null; unit?: string | null }>;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: PaginationQuery & { categoryId?: string; manufacturerId?: string; isActive?: string }) {
    const { skip, take } = getPagination(query);
    const searchWhere: Prisma.ProductWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { nameAr: { contains: query.search, mode: 'insensitive' } },
            { genericName: { contains: query.search, mode: 'insensitive' } },
            { brandName: { contains: query.search, mode: 'insensitive' } },
            { barcode: { contains: query.search } },
            { sku: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.manufacturerId ? { manufacturerId: query.manufacturerId } : {}),
      ...(query.isActive !== undefined && query.isActive !== ''
        ? { isActive: query.isActive === 'true' }
        : {}),
      ...searchWhere,
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: getSort(query) ?? { name: 'asc' },
        include: listInclude,
      }),
    ]);

    const stockMap = await this.getStockMap(products.map((p) => p.id));

    return {
      items: products.map((product) => this.toListItem(product, stockMap.get(product.id) ?? 0)),
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

  async exportCsv(query: PaginationQuery & { categoryId?: string; manufacturerId?: string; isActive?: string }): Promise<string> {
    const searchWhere: Prisma.ProductWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { nameAr: { contains: query.search, mode: 'insensitive' } },
            { genericName: { contains: query.search, mode: 'insensitive' } },
            { brandName: { contains: query.search, mode: 'insensitive' } },
            { barcode: { contains: query.search } },
            { sku: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.manufacturerId ? { manufacturerId: query.manufacturerId } : {}),
      ...(query.isActive !== undefined && query.isActive !== '' ? { isActive: query.isActive === 'true' } : {}),
      ...searchWhere,
    };

    const products = await this.prisma.product.findMany({
      where,
      take: 5000,
      orderBy: { name: 'asc' },
      include: listInclude,
    });
    const stockMap = await this.getStockMap(products.map((p) => p.id));

    const columns: CsvColumn[] = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'nameAr', label: 'Name (AR)' },
      { key: 'genericName', label: 'Generic Name' },
      { key: 'brandName', label: 'Brand' },
      { key: 'sku', label: 'SKU' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'category', label: 'Category' },
      { key: 'manufacturer', label: 'Manufacturer' },
      { key: 'dosageForm', label: 'Dosage Form' },
      { key: 'strength', label: 'Strength' },
      { key: 'unit', label: 'Unit' },
      { key: 'purchasePrice', label: 'Purchase Price' },
      { key: 'sellingPrice', label: 'Selling Price' },
      { key: 'taxRate', label: 'Tax Rate %' },
      { key: 'reorderLevel', label: 'Reorder Level' },
      { key: 'prescriptionRequired', label: 'Prescription Required' },
      { key: 'stockQuantity', label: 'Stock Qty' },
      { key: 'isActive', label: 'Active' },
    ];

    const rows = products.map((p) => {
      const stock = stockMap.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        nameAr: p.nameAr ?? '',
        genericName: p.genericName ?? '',
        brandName: p.brandName ?? '',
        sku: p.sku ?? '',
        barcode: p.barcode ?? '',
        category: p.category?.name ?? '',
        manufacturer: p.manufacturer?.name ?? '',
        dosageForm: p.dosageForm ?? '',
        strength: p.strength ?? '',
        unit: p.unit,
        purchasePrice: p.purchasePrice.toNumber(),
        sellingPrice: p.sellingPrice.toNumber(),
        taxRate: p.taxRate.toNumber(),
        reorderLevel: p.reorderLevel,
        prescriptionRequired: p.prescriptionRequired ? 'Yes' : 'No',
        stockQuantity: stock,
        isActive: p.isActive ? 'Yes' : 'No',
      };
    });

    return rowsToCsv(columns, rows);
  }

  async findOne(id: string): Promise<ProductDetail> {
    const product = await this.prisma.product.findUnique({ where: { id }, include: detailInclude });
    if (!product || product.deletedAt) throw new NotFoundException('Product not found');

    const stock = await this.getStockMap([id]);

    return {
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      genericName: product.genericName,
      brandName: product.brandName,
      barcode: product.barcode,
      sku: product.sku,
      categoryId: product.categoryId,
      manufacturerId: product.manufacturerId,
      dosageForm: product.dosageForm,
      strength: product.strength,
      packageSize: product.packageSize,
      unit: product.unit,
      purchasePrice: product.purchasePrice.toNumber(),
      sellingPrice: product.sellingPrice.toNumber(),
      minSellingPrice: product.minSellingPrice ? product.minSellingPrice.toNumber() : null,
      taxRate: product.taxRate.toNumber(),
      reorderLevel: product.reorderLevel,
      prescriptionRequired: product.prescriptionRequired,
      description: product.description,
      descriptionAr: product.descriptionAr,
      storageInstructions: product.storageInstructions,
      isActive: product.isActive,
      deletedAt: product.deletedAt,
      stockQuantity: stock.get(id) ?? 0,
      batchCount: product._count.batches,
      category: product.category,
      manufacturer: product.manufacturer,
      ingredients: product.ingredients,
    };
  }

  async create(dto: CreateProductDto, request?: Request): Promise<ProductDetail> {
    await this.validateReferences(dto.categoryId, dto.manufacturerId);
    await this.validateBarcodeSku(dto.barcode, dto.sku);

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        genericName: dto.genericName,
        brandName: dto.brandName,
        barcode: dto.barcode,
        sku: dto.sku,
        categoryId: dto.categoryId,
        manufacturerId: dto.manufacturerId,
        dosageForm: dto.dosageForm,
        strength: dto.strength,
        packageSize: dto.packageSize,
        unit: dto.unit ?? 'piece',
        purchasePrice: dto.purchasePrice ?? 0,
        sellingPrice: dto.sellingPrice ?? 0,
        minSellingPrice: dto.minSellingPrice,
        taxRate: dto.taxRate ?? 0,
        reorderLevel: dto.reorderLevel ?? 10,
        prescriptionRequired: dto.prescriptionRequired ?? false,
        description: dto.description,
        descriptionAr: dto.descriptionAr,
        storageInstructions: dto.storageInstructions,
        ingredients: dto.ingredients?.length
          ? { create: dto.ingredients.map((i) => ({ ingredientName: i.ingredientName, strength: i.strength, unit: i.unit })) }
          : undefined,
      },
    });

    void this.auditService.log({
      action: 'products.create',
      entityType: 'Product',
      entityId: product.id,
      newValue: { name: product.name, barcode: product.barcode },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.findOne(product.id);
  }

  async update(id: string, dto: UpdateProductDto, request?: Request): Promise<ProductDetail> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Product not found');

    if (dto.categoryId !== undefined || dto.manufacturerId !== undefined) {
      await this.validateReferences(
        dto.categoryId === undefined ? existing.categoryId : dto.categoryId,
        dto.manufacturerId === undefined ? existing.manufacturerId : dto.manufacturerId,
      );
    }
    await this.validateBarcodeSku(dto.barcode, dto.sku, id);

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        genericName: dto.genericName,
        brandName: dto.brandName,
        barcode: dto.barcode,
        sku: dto.sku,
        categoryId: dto.categoryId,
        manufacturerId: dto.manufacturerId,
        dosageForm: dto.dosageForm,
        strength: dto.strength,
        packageSize: dto.packageSize,
        unit: dto.unit,
        purchasePrice: dto.purchasePrice,
        sellingPrice: dto.sellingPrice,
        minSellingPrice: dto.minSellingPrice,
        taxRate: dto.taxRate,
        reorderLevel: dto.reorderLevel,
        prescriptionRequired: dto.prescriptionRequired,
        description: dto.description,
        descriptionAr: dto.descriptionAr,
        storageInstructions: dto.storageInstructions,
        isActive: dto.isActive,
        ingredients:
          dto.ingredients !== undefined
            ? {
                deleteMany: {},
                create: dto.ingredients.map((i) => ({ ingredientName: i.ingredientName, strength: i.strength, unit: i.unit })),
              }
            : undefined,
      },
    });

    void this.auditService.log({
      action: 'products.update',
      entityType: 'Product',
      entityId: id,
      previousValue: { name: existing.name },
      newValue: { name: product.name, isActive: product.isActive },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.findOne(id);
  }

  async remove(id: string, request?: Request): Promise<{ success: boolean }> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Product not found');

    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

    void this.auditService.log({
      action: 'products.delete',
      entityType: 'Product',
      entityId: id,
      previousValue: { name: existing.name, barcode: existing.barcode },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return { success: true };
  }

  private async getStockMap(productIds: string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();
    const rows = await this.prisma.batch.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _sum: { remainingQuantity: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.productId, row._sum.remainingQuantity ?? 0);
    }
    return map;
  }

  private toListItem(
    product: Prisma.ProductGetPayload<{ include: typeof listInclude }>,
    stockQuantity: number,
  ): ProductListItem {
    return {
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      brandName: product.brandName,
      barcode: product.barcode,
      sku: product.sku,
      unit: product.unit,
      purchasePrice: product.purchasePrice.toNumber(),
      sellingPrice: product.sellingPrice.toNumber(),
      taxRate: product.taxRate.toNumber(),
      reorderLevel: product.reorderLevel,
      prescriptionRequired: product.prescriptionRequired,
      isActive: product.isActive,
      stockQuantity,
      category: product.category,
      manufacturer: product.manufacturer,
    };
  }

  private async validateReferences(categoryId?: string | null, manufacturerId?: string | null): Promise<void> {
    if (categoryId) {
      const category = await this.prisma.productCategory.findUnique({ where: { id: categoryId } });
      if (!category) throw new BadRequestException('Category not found');
    }
    if (manufacturerId) {
      const manufacturer = await this.prisma.manufacturer.findUnique({ where: { id: manufacturerId } });
      if (!manufacturer) throw new BadRequestException('Manufacturer not found');
    }
  }

  private async validateBarcodeSku(barcode?: string, sku?: string, excludeId?: string): Promise<void> {
    if (barcode) {
      const dup = await this.prisma.product.findFirst({ where: { barcode, NOT: { id: excludeId }, deletedAt: null } });
      if (dup) throw new ConflictException('Barcode already in use');
    }
    if (sku) {
      const dup = await this.prisma.product.findFirst({ where: { sku, NOT: { id: excludeId }, deletedAt: null } });
      if (dup) throw new ConflictException('SKU already in use');
    }
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}