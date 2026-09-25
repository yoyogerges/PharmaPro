import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, PurchaseOrder } from '@prisma/client';
import { getPagination, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { NumberingService } from '../../common/services/numbering.service';
import { PrismaService } from '../../prisma/prisma.service';
import { computeOrderTotals } from '../purchase-orders/purchase-orders.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';

const receiptInclude = {
  supplier: { select: { id: true, name: true, phone: true } },
  receivedBy: { select: { id: true, firstName: true, lastName: true } },
  purchaseOrder: { select: { id: true, poNumber: true, status: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
    },
  },
} satisfies Prisma.PurchaseReceiptInclude;

const RECEIVABLE_STATUSES: PurchaseOrder['status'][] = ['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'];

@Injectable()
export class PurchaseReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly numbering: NumberingService,
  ) {}

  async findAll(query: PaginationQuery & { supplierId?: string; purchaseOrderId?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    const { skip, take } = getPagination(query);

    const where: Prisma.PurchaseReceiptWhereInput = {
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.purchaseOrderId ? { purchaseOrderId: query.purchaseOrderId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            receiptDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { receiptNumber: { contains: query.search, mode: 'insensitive' } },
              { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.purchaseReceipt.count({ where }),
      this.prisma.purchaseReceipt.findMany({
        where,
        skip,
        take,
        orderBy: { receiptDate: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, firstName: true, lastName: true } },
          purchaseOrder: { select: { id: true, poNumber: true } },
          items: { select: { receivedQuantity: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        receiptNumber: row.receiptNumber,
        purchaseOrderId: row.purchaseOrderId,
        supplierId: row.supplierId,
        receiptDate: row.receiptDate,
        invoiceNumber: row.invoiceNumber,
        subtotal: row.subtotal.toNumber(),
        taxAmount: row.taxAmount.toNumber(),
        discountAmount: row.discountAmount.toNumber(),
        totalAmount: row.totalAmount.toNumber(),
        notes: row.notes,
        createdAt: row.createdAt,
        supplier: row.supplier,
        receivedBy: row.receivedBy,
        purchaseOrder: row.purchaseOrder,
        lineCount: row.items.length || 0,
        itemCount: row.items.reduce((sum, i) => sum + i.receivedQuantity, 0),
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

  async create(dto: CreateReceiptDto, request?: Request) {
    let purchaseOrder: Prisma.PurchaseOrderGetPayload<{ include: { items: true } }> | null = null;

    if (dto.purchaseOrderId) {
      purchaseOrder = await this.prisma.purchaseOrder.findUnique({
        where: { id: dto.purchaseOrderId },
        include: { items: true },
      });
      if (!purchaseOrder) throw new NotFoundException('Purchase order not found');
      if (!RECEIVABLE_STATUSES.includes(purchaseOrder.status)) {
        throw new BadRequestException('Purchase order is not in a receivable state');
      }
    }

    const supplierId = dto.supplierId ?? purchaseOrder?.supplierId;
    if (!supplierId) throw new BadRequestException('Supplier is required when not receiving against a purchase order');

    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier || !supplier.isActive) throw new NotFoundException('Supplier not found');

    const vatRate = await this.resolveVatRate();
    const totals = computeOrderTotals(
      dto.items.map((i) => ({ productId: i.productId, quantity: i.receivedQuantity, unitPrice: i.unitPrice, taxRate: vatRate, discount: 0 })),
      dto.discountAmount ?? 0,
    );

    const userId = this.currentUserId(request);

    const receipt = await this.prisma.$transaction(async (tx) => {
      const productIds = [...new Set(dto.items.map((i) => i.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, deletedAt: null, isActive: true },
        select: { id: true, sellingPrice: true },
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException('One or more products are invalid or inactive');
      }
      const productMap = new Map(products.map((p) => [p.id, p]));

      if (purchaseOrder) {
        const poItemMap = new Map(purchaseOrder.items.map((i) => [i.id, i]));
        const orderItemIds = dto.items.map((i) => i.purchaseOrderItemId).filter(Boolean) as string[];

        if (orderItemIds.length > 0) {
          const orderItems = orderItemIds.map((id) => {
            const item = poItemMap.get(id);
            if (!item) throw new BadRequestException('One or more items do not belong to this purchase order');
            return item;
          });
          const byItem = new Map(orderItems.map((i) => [i.id, dto.items.find((di) => di.purchaseOrderItemId === i.id)!]));
          for (const item of orderItems) {
            const received = byItem.get(item.id)!;
            if (item.productId !== received.productId) {
              throw new BadRequestException('Item product does not match the purchase order line');
            }
            if (item.quantity - item.receivedQuantity < received.receivedQuantity) {
              throw new ConflictException(`Received quantity exceeds the remaining quantity on the purchase order line for ${item.productId}`);
            }
          }
        }
      }

      for (const item of dto.items) {
        const dup = await tx.batch.findUnique({
          where: { productId_batchNumber: { productId: item.productId, batchNumber: item.batchNumber } },
        });
        if (dup) {
          throw new ConflictException(`Batch number ${item.batchNumber} already exists for this product`);
        }
      }

      const receiptNumber = await this.numbering.generate('purchaseReceipt');
      const created = await tx.purchaseReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          supplierId,
          receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
          receivedById: userId ?? '',
          invoiceNumber: dto.invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              purchaseOrderItemId: item.purchaseOrderItemId ?? null,
              receivedQuantity: item.receivedQuantity,
              unitPrice: item.unitPrice,
              batchNumber: item.batchNumber,
              expiryDate: new Date(item.expiryDate),
              totalPrice: item.receivedQuantity * item.unitPrice,
            })),
          },
        },
        include: receiptInclude,
      });

      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        const newBatch = await tx.batch.create({
          data: {
            productId: item.productId,
            batchNumber: item.batchNumber,
            expiryDate: new Date(item.expiryDate),
            purchasePrice: item.unitPrice,
            sellingPrice: product.sellingPrice,
            quantity: item.receivedQuantity,
            remainingQuantity: item.receivedQuantity,
            supplierId,
            purchaseReceiptId: created.id,
          },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            batchId: newBatch.id,
            type: 'PURCHASE',
            quantity: item.receivedQuantity,
            beforeQuantity: 0,
            afterQuantity: item.receivedQuantity,
            referenceType: 'PurchaseReceipt',
            referenceId: created.id,
            userId: userId ?? null,
            notes: receiptNumber,
          },
        });
      }

      if (purchaseOrder) {
        const poItemMap = new Map(purchaseOrder.items.map((i) => [i.id, i]));
        for (const item of dto.items) {
          if (!item.purchaseOrderItemId) continue;
          const poItem = poItemMap.get(item.purchaseOrderItemId);
          if (!poItem) continue;
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQuantity: { increment: item.receivedQuantity } },
          });
        }

        const refreshed = await tx.purchaseOrder.findUnique({
          where: { id: purchaseOrder.id },
          include: { items: { select: { quantity: true, receivedQuantity: true } } },
        });
        if (refreshed) {
          const allReceived = refreshed.items.every((i) => i.receivedQuantity >= i.quantity);
          await tx.purchaseOrder.update({
            where: { id: purchaseOrder.id },
            data: { status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
          });
        }
      }

      return created;
    });

    void this.auditService.log({
      action: 'purchase_receipts.create',
      entityType: 'PurchaseReceipt',
      entityId: receipt.id,
      newValue: {
        receiptNumber: receipt.receiptNumber,
        purchaseOrderId: dto.purchaseOrderId ?? null,
        supplierId,
        totalAmount: totals.totalAmount,
        itemCount: dto.items.length,
      },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(receipt);
  }

  async findOne(id: string) {
    const row = await this.prisma.purchaseReceipt.findUnique({ where: { id }, include: receiptInclude });
    if (!row) throw new NotFoundException('Purchase receipt not found');
    return this.toDetail(row);
  }

  // ── Helpers ─────────────────────────────────────────────────

  private toDetail(row: Prisma.PurchaseReceiptGetPayload<{ include: typeof receiptInclude }>) {
    return {
      id: row.id,
      receiptNumber: row.receiptNumber,
      purchaseOrderId: row.purchaseOrderId,
      supplierId: row.supplierId,
      receiptDate: row.receiptDate,
      receivedById: row.receivedById,
      invoiceNumber: row.invoiceNumber,
      invoiceDate: row.invoiceDate,
      subtotal: row.subtotal.toNumber(),
      taxAmount: row.taxAmount.toNumber(),
      discountAmount: row.discountAmount.toNumber(),
      totalAmount: row.totalAmount.toNumber(),
      notes: row.notes,
      createdAt: row.createdAt,
      supplier: row.supplier,
      receivedBy: row.receivedBy,
      purchaseOrder: row.purchaseOrder,
      items: row.items.map((item) => ({
        id: item.id,
        purchaseReceiptId: item.purchaseReceiptId,
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: item.productId,
        receivedQuantity: item.receivedQuantity,
        unitPrice: item.unitPrice.toNumber(),
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        totalPrice: item.totalPrice.toNumber(),
        product: item.product,
      })),
    };
  }

  private async resolveVatRate(): Promise<number> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'vat_rate' } });
    const value = Number(setting?.value ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}