import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { getPagination, type InventoryMovementType, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockAdjustmentDto } from './dto/stock-adjustment.dto';

const ADJUSTMENT_TYPES: InventoryMovementType[] = ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'];
const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

const movementInclude = {
  product: { select: { id: true, name: true, sku: true } },
  batch: { select: { id: true, batchNumber: true, expiryDate: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.InventoryMovementInclude;

const adjustmentInclude = {
  product: { select: { id: true, name: true, sku: true } },
  batch: { select: { id: true, batchNumber: true } },
  adjustedBy: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.StockAdjustmentInclude;

export interface StockLevelItem {
  productId: string;
  name: string;
  nameAr?: string | null;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  totalQuantity: number;
  totalBatches: number;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  stockValue: number;
  isLowStock: boolean;
}

export interface ValuationSummary {
  totalProducts: number;
  totalUnits: number;
  batchCount: number;
  lowStockCount: number;
  costValue: number;
  retailValue: number;
  potentialProfit: number;
  expiredBatches: number;
  expiredUnits: number;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Stock levels ───────────────────────────────────────────────

  async getStockLevels(query: PaginationQuery & { search?: string; categoryId?: string; isLowStock?: string; inStock?: string; sort?: string }) {
    return this.buildStockLevels(
      {
        deletedAt: null,
        isActive: true,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { nameAr: { contains: query.search, mode: 'insensitive' } },
                { sku: { contains: query.search, mode: 'insensitive' } },
                { barcode: { contains: query.search } },
              ],
            }
          : {}),
      },
      {
        lowStock: query.isLowStock === 'true',
        inStock: query.inStock === 'true',
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
        sort: query.sort,
      },
    );
  }

  async getLowStock(query: PaginationQuery & { search?: string; categoryId?: string; sort?: string }) {
    return this.buildStockLevels(
      {
        deletedAt: null,
        isActive: true,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { nameAr: { contains: query.search, mode: 'insensitive' } },
                { sku: { contains: query.search, mode: 'insensitive' } },
                { barcode: { contains: query.search } },
              ],
            }
          : {}),
      },
      {
        lowStock: true,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
        sort: query.sort,
      },
    );
  }

  async getValuation(): Promise<ValuationSummary> {
    const now = new Date();

    const [products, stockRows, batchCount, expiredBatches] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, purchasePrice: true, sellingPrice: true, reorderLevel: true },
      }),
      this.prisma.batch.groupBy({
        by: ['productId'],
        orderBy: { productId: 'asc' },
        _sum: { remainingQuantity: true },
      }),
      this.prisma.batch.count(),
      this.prisma.batch.findMany({
        where: { expiryDate: { lt: now } },
        select: { remainingQuantity: true },
      }),
    ]);

    const stockMap = new Map(stockRows.map((r) => [r.productId, r._sum?.remainingQuantity ?? 0]));

    let totalUnits = 0;
    let costValue = 0;
    let retailValue = 0;
    let lowStockCount = 0;

    for (const product of products) {
      const qty = stockMap.get(product.id) ?? 0;
      totalUnits += qty;
      costValue += qty * product.purchasePrice.toNumber();
      retailValue += qty * product.sellingPrice.toNumber();
      if (qty < product.reorderLevel) lowStockCount += 1;
    }

    const expiredBatchesCount = expiredBatches.length;
    const expiredUnits = expiredBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);

    return {
      totalProducts: products.length,
      totalUnits,
      batchCount,
      lowStockCount,
      costValue: Math.round(costValue * 100) / 100,
      retailValue: Math.round(retailValue * 100) / 100,
      potentialProfit: Math.round((retailValue - costValue) * 100) / 100,
      expiredBatches: expiredBatchesCount,
      expiredUnits,
    };
  }

  // ── Movements ─────────────────────────────────────────────────

  async getMovements(query: PaginationQuery & { productId?: string; batchId?: string; type?: string; dateFrom?: string; dateTo?: string }) {
    const { skip, take } = getPagination(query);

    const where: Prisma.InventoryMovementWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.batchId ? { batchId: query.batchId } : {}),
      ...(query.type && query.type in ['PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'EXPIRED_WRITE_OFF']
        ? { type: query.type as InventoryMovementType }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [total, movements] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.count({ where }),
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: movementInclude,
      }),
    ]);

    return {
      items: movements,
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

  // ── Adjustments ───────────────────────────────────────────────

  async createAdjustment(dto: CreateStockAdjustmentDto, request?: Request) {
    if (!ADJUSTMENT_TYPES.includes(dto.type)) {
      throw new BadRequestException('Adjustment type must be ADJUSTMENT_IN or ADJUSTMENT_OUT');
    }

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.deletedAt) throw new NotFoundException('Product not found');

    if (dto.batchId) {
      const batch = await this.prisma.batch.findUnique({ where: { id: dto.batchId } });
      if (!batch) throw new NotFoundException('Batch not found');
      if (batch.productId !== dto.productId) {
        throw new BadRequestException('Batch does not belong to the selected product');
      }
    }

    const adjustment = await this.prisma.stockAdjustment.create({
      data: {
        productId: dto.productId,
        batchId: dto.batchId,
        type: dto.type,
        quantity: dto.quantity,
        reason: dto.reason,
        notes: dto.notes,
        adjustedById: this.currentUserId(request) ?? '',
      },
      include: adjustmentInclude,
    });

    void this.auditService.log({
      action: 'inventory.adjustment.create',
      entityType: 'StockAdjustment',
      entityId: adjustment.id,
      newValue: { productId: dto.productId, type: dto.type, quantity: dto.quantity, reason: dto.reason },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return adjustment;
  }

  async listAdjustments(query: PaginationQuery & { status?: string; productId?: string }) {
    const { skip, take } = getPagination(query);

    const where: Prisma.StockAdjustmentWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.status && VALID_STATUSES.includes(query.status) ? { status: query.status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}),
    };

    const [total, adjustments] = await this.prisma.$transaction([
      this.prisma.stockAdjustment.count({ where }),
      this.prisma.stockAdjustment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: adjustmentInclude,
      }),
    ]);

    return {
      items: adjustments,
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

  async approveAdjustment(id: string, request?: Request) {
    const approverId = this.currentUserId(request);

    const adjustment = await this.prisma.stockAdjustment.findUnique({ where: { id } });
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    if (adjustment.status !== 'PENDING') {
      throw new BadRequestException('Only pending adjustments can be approved');
    }

    const product = await this.prisma.product.findUnique({ where: { id: adjustment.productId } });
    if (!product || product.deletedAt) throw new NotFoundException('Product not found');

    await this.prisma.$transaction(async (tx) => {
      if (adjustment.batchId) {
        const batch = await tx.batch.findUnique({ where: { id: adjustment.batchId } });
        if (!batch) throw new NotFoundException('Batch not found');

        if (adjustment.type === 'ADJUSTMENT_OUT') {
          if (batch.remainingQuantity < adjustment.quantity) {
            throw new ConflictException('Insufficient stock in batch');
          }
          const after = batch.remainingQuantity - adjustment.quantity;
          await tx.batch.update({ where: { id: batch.id }, data: { remainingQuantity: after } });
          await tx.inventoryMovement.create({
            data: {
              productId: adjustment.productId,
              batchId: adjustment.batchId,
              type: 'ADJUSTMENT_OUT',
              quantity: adjustment.quantity,
              beforeQuantity: batch.remainingQuantity,
              afterQuantity: after,
              referenceType: 'StockAdjustment',
              referenceId: adjustment.id,
              userId: approverId ?? null,
              notes: adjustment.reason,
            },
          });
        } else {
          const after = batch.remainingQuantity + adjustment.quantity;
          await tx.batch.update({ where: { id: batch.id }, data: { remainingQuantity: after } });
          await tx.inventoryMovement.create({
            data: {
              productId: adjustment.productId,
              batchId: adjustment.batchId,
              type: 'ADJUSTMENT_IN',
              quantity: adjustment.quantity,
              beforeQuantity: batch.remainingQuantity,
              afterQuantity: after,
              referenceType: 'StockAdjustment',
              referenceId: adjustment.id,
              userId: approverId ?? null,
              notes: adjustment.reason,
            },
          });
        }
      } else {
        const batches = await tx.batch.findMany({ where: { productId: adjustment.productId }, orderBy: { expiryDate: 'asc' } });
        const totalAvailable = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);

        if (adjustment.type === 'ADJUSTMENT_OUT') {
          if (totalAvailable < adjustment.quantity) {
            throw new ConflictException('Insufficient stock for product');
          }
          let remaining = adjustment.quantity;
          for (const batch of batches) {
            const take = Math.min(batch.remainingQuantity, remaining);
            if (take <= 0) continue;
            await tx.batch.update({
              where: { id: batch.id },
              data: { remainingQuantity: { decrement: take } },
            });
            remaining -= take;
            if (remaining <= 0) break;
          }
          await tx.inventoryMovement.create({
            data: {
              productId: adjustment.productId,
              batchId: null,
              type: 'ADJUSTMENT_OUT',
              quantity: adjustment.quantity,
              beforeQuantity: totalAvailable,
              afterQuantity: totalAvailable - adjustment.quantity,
              referenceType: 'StockAdjustment',
              referenceId: adjustment.id,
              userId: approverId ?? null,
              notes: adjustment.reason,
            },
          });
        } else {
          if (batches.length === 0) {
            throw new BadRequestException('Product has no batches; specify a batch for this adjustment');
          }
          const target = batches.reduce((a, b) => (b.expiryDate > a.expiryDate ? b : a));
          await tx.batch.update({
            where: { id: target.id },
            data: { remainingQuantity: { increment: adjustment.quantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: adjustment.productId,
              batchId: null,
              type: 'ADJUSTMENT_IN',
              quantity: adjustment.quantity,
              beforeQuantity: totalAvailable,
              afterQuantity: totalAvailable + adjustment.quantity,
              referenceType: 'StockAdjustment',
              referenceId: adjustment.id,
              userId: approverId ?? null,
              notes: adjustment.reason,
            },
          });
        }
      }

      await tx.stockAdjustment.update({
        where: { id },
        data: { status: 'APPROVED', approvedById: approverId ?? null },
      });
    });

    void this.auditService.log({
      action: 'inventory.adjustment.approve',
      entityType: 'StockAdjustment',
      entityId: id,
      newValue: { status: 'APPROVED', type: adjustment.type, quantity: adjustment.quantity },
      userId: approverId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.prisma.stockAdjustment.findUnique({ where: { id }, include: adjustmentInclude });
  }

  async rejectAdjustment(id: string, request?: Request) {
    const adjustment = await this.prisma.stockAdjustment.findUnique({ where: { id } });
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    if (adjustment.status !== 'PENDING') {
      throw new BadRequestException('Only pending adjustments can be rejected');
    }

    const updated = await this.prisma.stockAdjustment.update({
      where: { id },
      data: { status: 'REJECTED', approvedById: this.currentUserId(request) ?? null },
      include: adjustmentInclude,
    });

    void this.auditService.log({
      action: 'inventory.adjustment.reject',
      entityType: 'StockAdjustment',
      entityId: id,
      newValue: { status: 'REJECTED' },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return updated;
  }

  // ── Helpers ─────────────────────────────────────────────────

  private async buildStockLevels(
    productWhere: Prisma.ProductWhereInput,
    options: { lowStock?: boolean; inStock?: boolean; page: number; limit: number; sort?: string },
  ): Promise<{ items: StockLevelItem[]; meta: Record<string, number | boolean> }> {
    const products = await this.prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true,
        nameAr: true,
        sku: true,
        barcode: true,
        category: { select: { name: true } },
        reorderLevel: true,
        purchasePrice: true,
        sellingPrice: true,
      },
    });

    const ids = products.map((p) => p.id);
    const [stockRows, countRows] =
      ids.length === 0
        ? [[], []]
        : await this.prisma.$transaction([
            this.prisma.batch.groupBy({
              by: ['productId'],
              orderBy: { productId: 'asc' },
              where: { productId: { in: ids } },
              _sum: { remainingQuantity: true },
            }),
            this.prisma.batch.groupBy({
              by: ['productId'],
              orderBy: { productId: 'asc' },
              where: { productId: { in: ids } },
              _count: { productId: true },
            }),
          ]);

    const stockMap = new Map((stockRows as Array<{ productId: string; _sum: { remainingQuantity: number | null } }>).map((r) => [r.productId, r._sum.remainingQuantity ?? 0]));
    const countMap = new Map((countRows as Array<{ productId: string; _count: { productId: number } }>).map((r) => [r.productId, r._count.productId]));

    let items: StockLevelItem[] = products.map((p) => {
      const totalQuantity = stockMap.get(p.id) ?? 0;
      return {
        productId: p.id,
        name: p.name,
        nameAr: p.nameAr,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category?.name ?? null,
        totalQuantity,
        totalBatches: countMap.get(p.id) ?? 0,
        reorderLevel: p.reorderLevel,
        purchasePrice: p.purchasePrice.toNumber(),
        sellingPrice: p.sellingPrice.toNumber(),
        stockValue: Math.round(totalQuantity * p.purchasePrice.toNumber() * 100) / 100,
        isLowStock: totalQuantity < p.reorderLevel,
      };
    });

    if (options.lowStock) items = items.filter((i) => i.isLowStock);
    if (options.inStock) items = items.filter((i) => i.totalQuantity > 0);

    if (options.sort === 'stock_asc') items.sort((a, b) => a.totalQuantity - b.totalQuantity);
    else if (options.sort === 'stock_desc') items.sort((a, b) => b.totalQuantity - a.totalQuantity);
    else if (options.sort === 'value_desc') items.sort((a, b) => b.stockValue - a.stockValue);

    const total = items.length;
    const skip = (options.page - 1) * options.limit;
    const paged = items.slice(skip, skip + options.limit);

    return {
      items: paged,
      meta: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit) || 1,
        hasNextPage: options.page * options.limit < total,
        hasPrevPage: options.page > 1,
      },
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}