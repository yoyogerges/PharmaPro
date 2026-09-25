import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { getPagination, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { NumberingService } from '../../common/services/numbering.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';

const returnInclude = {
  supplier: { select: { id: true, name: true, phone: true } },
  returnedBy: { select: { id: true, firstName: true, lastName: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
      batch: { select: { id: true, batchNumber: true, expiryDate: true } },
    },
  },
} satisfies Prisma.PurchaseReturnInclude;

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class PurchaseReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly numbering: NumberingService,
  ) {}

  async findAll(query: PaginationQuery & { status?: string; supplierId?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    const { skip, take } = getPagination(query);

    const where: Prisma.PurchaseReturnWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            returnDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { returnNumber: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.purchaseReturn.count({ where }),
      this.prisma.purchaseReturn.findMany({
        where,
        skip,
        take,
        orderBy: { returnDate: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          returnedBy: { select: { id: true, firstName: true, lastName: true } },
          items: { select: { quantity: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        returnNumber: row.returnNumber,
        purchaseReceiptId: row.purchaseReceiptId,
        supplierId: row.supplierId,
        returnDate: row.returnDate,
        reason: row.reason,
        subtotal: row.subtotal.toNumber(),
        taxAmount: row.taxAmount.toNumber(),
        totalAmount: row.totalAmount.toNumber(),
        status: row.status,
        notes: row.notes,
        createdAt: row.createdAt,
        supplier: row.supplier,
        returnedBy: row.returnedBy,
        itemCount: row.items.reduce((sum, i) => sum + i.quantity, 0),
      })),
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

  async create(dto: CreatePurchaseReturnDto, request?: Request) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier || !supplier.isActive) throw new NotFoundException('Supplier not found');

    if (dto.purchaseReceiptId) {
      const receipt = await this.prisma.purchaseReceipt.findUnique({ where: { id: dto.purchaseReceiptId } });
      if (!receipt) throw new NotFoundException('Purchase receipt not found');
      if (receipt.supplierId !== dto.supplierId) {
        throw new ConflictException('Receipt belongs to a different supplier');
      }
    }

    const userId = this.currentUserId(request);
    const returnNumber = await this.numbering.generate('purchaseReturn');
    const subtotal = r2(dto.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));

    const returnRow = await this.prisma.$transaction(async (tx) => {
      const productIds = [...new Set(dto.items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, deletedAt: null, isActive: true },
        select: { id: true },
      });
      if (products.length !== productIds.length) {
        throw new ConflictException('One or more products are invalid or inactive');
      }

      const created = await tx.purchaseReturn.create({
        data: {
          returnNumber,
          purchaseReceiptId: dto.purchaseReceiptId ?? null,
          supplierId: dto.supplierId,
          returnDate: dto.returnDate ? new Date(dto.returnDate) : new Date(),
          reason: dto.reason,
          subtotal,
          taxAmount: 0,
          totalAmount: subtotal,
          status: 'PENDING',
          returnedById: userId ?? '',
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              batchId: item.batchId ?? null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              reason: item.reason,
            })),
          },
        },
        include: returnInclude,
      });

      for (const item of dto.items) {
        if (item.batchId) {
          const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
          if (!batch) throw new NotFoundException('Batch not found');
          if (batch.productId !== item.productId) {
            throw new ConflictException('Batch does not belong to the selected product');
          }
          if (batch.remainingQuantity < item.quantity) {
            throw new ConflictException(`Insufficient stock in batch for return (${item.quantity} requested, ${batch.remainingQuantity} available)`);
          }
          const after = batch.remainingQuantity - item.quantity;
          await tx.batch.update({ where: { id: batch.id }, data: { remainingQuantity: after } });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              batchId: batch.id,
              type: 'PURCHASE_RETURN',
              quantity: item.quantity,
              beforeQuantity: batch.remainingQuantity,
              afterQuantity: after,
              referenceType: 'PurchaseReturn',
              referenceId: created.id,
              userId: userId ?? null,
              notes: returnNumber,
            },
          });
        } else {
          const batches = await tx.batch.findMany({
            where: { productId: item.productId, remainingQuantity: { gt: 0 } },
            orderBy: { expiryDate: 'asc' },
          });
          const totalAvailable = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
          if (totalAvailable < item.quantity) {
            throw new ConflictException(`Insufficient stock for product to return (${item.quantity} requested, ${totalAvailable} available)`);
          }
          let remaining = item.quantity;
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
              productId: item.productId,
              batchId: null,
              type: 'PURCHASE_RETURN',
              quantity: item.quantity,
              beforeQuantity: totalAvailable,
              afterQuantity: totalAvailable - item.quantity,
              referenceType: 'PurchaseReturn',
              referenceId: created.id,
              userId: userId ?? null,
              notes: returnNumber,
            },
          });
        }
      }

      return created;
    });

    void this.auditService.log({
      action: 'purchase_returns.create',
      entityType: 'PurchaseReturn',
      entityId: returnRow.id,
      newValue: { returnNumber, supplierId: dto.supplierId, totalAmount: subtotal, itemCount: dto.items.length },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(returnRow);
  }

  async findOne(id: string) {
    const row = await this.prisma.purchaseReturn.findUnique({ where: { id }, include: returnInclude });
    if (!row) throw new NotFoundException('Purchase return not found');
    return this.toDetail(row);
  }

  // ── Helpers ─────────────────────────────────────────────────

  private toDetail(row: Prisma.PurchaseReturnGetPayload<{ include: typeof returnInclude }>) {
    return {
      id: row.id,
      returnNumber: row.returnNumber,
      purchaseReceiptId: row.purchaseReceiptId,
      supplierId: row.supplierId,
      returnDate: row.returnDate,
      reason: row.reason,
      subtotal: row.subtotal.toNumber(),
      taxAmount: row.taxAmount.toNumber(),
      totalAmount: row.totalAmount.toNumber(),
      status: row.status,
      returnedById: row.returnedById,
      notes: row.notes,
      createdAt: row.createdAt,
      supplier: row.supplier,
      returnedBy: row.returnedBy,
      items: row.items.map((item) => ({
        id: item.id,
        purchaseReturnId: item.purchaseReturnId,
        productId: item.productId,
        batchId: item.batchId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        reason: item.reason,
        product: item.product,
        batch: item.batch,
      })),
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}