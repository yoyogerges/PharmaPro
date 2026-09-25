import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { getPagination, type PaginationQuery, type ExpiryInfo } from '@pharmapro/shared';
import { PrismaService } from '../../prisma/prisma.service';

const batchInclude = {
  product: { select: { id: true, name: true, sku: true, barcode: true } },
  supplier: { select: { id: true, name: true } },
} satisfies Prisma.BatchInclude;

export interface BatchListItem {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: Date;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  remainingQuantity: number;
  supplierId?: string | null;
  purchaseReceiptId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  daysToExpiry: number;
  status: 'EXPIRED' | 'NEAR_EXPIRY' | 'OK';
  product?: { id: string; name: string; sku?: string | null; barcode?: string | null } | null;
  supplier?: { id: string; name: string } | null;
}

const DAYS_MS = 24 * 60 * 60 * 1000;

function expiryStatus(expiryDate: Date): { daysToExpiry: number; status: 'EXPIRED' | 'NEAR_EXPIRY' | 'OK' } {
  const now = Date.now();
  const daysToExpiry = Math.floor((expiryDate.getTime() - now) / DAYS_MS);
  const status = daysToExpiry < 0 ? 'EXPIRED' : daysToExpiry <= 30 ? 'NEAR_EXPIRY' : 'OK';
  return { daysToExpiry, status };
}

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQuery & { productId?: string; status?: string; search?: string }) {
    const { skip, take } = getPagination(query);

    const where: Prisma.BatchWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.status === 'EXPIRED' ? { expiryDate: { lt: new Date() } } : {}),
      ...(query.status === 'ACTIVE'
        ? { expiryDate: { gte: new Date() }, remainingQuantity: { gt: 0 } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { batchNumber: { contains: query.search, mode: 'insensitive' } },
              { product: { name: { contains: query.search, mode: 'insensitive' } } },
              { product: { sku: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, batches] = await this.prisma.$transaction([
      this.prisma.batch.count({ where }),
      this.prisma.batch.findMany({
        where,
        skip,
        take,
        orderBy: { expiryDate: 'asc' },
        include: batchInclude,
      }),
    ]);

    const items = batches.map((batch) => ({
      id: batch.id,
      productId: batch.productId,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      purchasePrice: batch.purchasePrice.toNumber(),
      sellingPrice: batch.sellingPrice.toNumber(),
      quantity: batch.quantity,
      remainingQuantity: batch.remainingQuantity,
      supplierId: batch.supplierId,
      purchaseReceiptId: batch.purchaseReceiptId,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      ...expiryStatus(batch.expiryDate),
      product: batch.product,
      supplier: batch.supplier,
    }));

    return {
      items,
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

  async findOne(id: string): Promise<BatchListItem> {
    const batch = await this.prisma.batch.findUnique({ where: { id }, include: batchInclude });
    if (!batch) throw new NotFoundException('Batch not found');

    return {
      id: batch.id,
      productId: batch.productId,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      purchasePrice: batch.purchasePrice.toNumber(),
      sellingPrice: batch.sellingPrice.toNumber(),
      quantity: batch.quantity,
      remainingQuantity: batch.remainingQuantity,
      supplierId: batch.supplierId,
      purchaseReceiptId: batch.purchaseReceiptId,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      ...expiryStatus(batch.expiryDate),
      product: batch.product,
      supplier: batch.supplier,
    };
  }

  async findByProduct(productId: string): Promise<BatchListItem[]> {
    const batches = await this.prisma.batch.findMany({
      where: { productId },
      orderBy: { expiryDate: 'asc' },
      include: batchInclude,
    });

    return batches.map((batch) => ({
      id: batch.id,
      productId: batch.productId,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      purchasePrice: batch.purchasePrice.toNumber(),
      sellingPrice: batch.sellingPrice.toNumber(),
      quantity: batch.quantity,
      remainingQuantity: batch.remainingQuantity,
      supplierId: batch.supplierId,
      purchaseReceiptId: batch.purchaseReceiptId,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      ...expiryStatus(batch.expiryDate),
      product: batch.product,
      supplier: batch.supplier,
    }));
  }

  async findExpired(): Promise<ExpiryInfo[]> {
    const batches = await this.prisma.batch.findMany({
      where: { expiryDate: { lt: new Date() } },
      orderBy: { expiryDate: 'asc' },
      include: { product: { select: { id: true, name: true } } },
    });

    return batches.map((batch) => ({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
      productName: batch.product.name,
      expiryDate: batch.expiryDate.toISOString(),
      remainingQuantity: batch.remainingQuantity,
      daysToExpiry: expiryStatus(batch.expiryDate).daysToExpiry,
      status: 'EXPIRED',
    }));
  }

  async findNearExpiry(days = 30): Promise<ExpiryInfo[]> {
    const now = new Date();
    const upper = new Date(now.getTime() + days * DAYS_MS);
    const batches = await this.prisma.batch.findMany({
      where: { expiryDate: { gte: now, lte: upper }, remainingQuantity: { gt: 0 } },
      orderBy: { expiryDate: 'asc' },
      include: { product: { select: { id: true, name: true } } },
    });

    return batches.map((batch) => ({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
      productName: batch.product.name,
      expiryDate: batch.expiryDate.toISOString(),
      remainingQuantity: batch.remainingQuantity,
      daysToExpiry: expiryStatus(batch.expiryDate).daysToExpiry,
      status: 'NEAR_EXPIRY',
    }));
  }
}