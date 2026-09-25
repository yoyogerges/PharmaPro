import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, SaleStatus, type Prisma } from '@prisma/client';
import { getPagination, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { NumberingService } from '../../common/services/numbering.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';

const returnInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  returnedBy: { select: { id: true, firstName: true, lastName: true } },
  sale: { select: { id: true, invoiceNumber: true, saleDate: true, totalAmount: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
      batch: { select: { id: true, batchNumber: true } },
      saleItem: { select: { id: true, quantity: true } },
    },
  },
} satisfies Prisma.SalesReturnInclude;

type Tx = Prisma.TransactionClient;

@Injectable()
export class SalesReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly numbering: NumberingService,
  ) {}

  async findAll(
    query: PaginationQuery & {
      status?: string;
      customerId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
  ) {
    const { skip, take } = getPagination(query);

    const where: Prisma.SalesReturnWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
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
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              { sale: { invoiceNumber: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.salesReturn.count({ where }),
      this.prisma.salesReturn.findMany({
        where,
        skip,
        take,
        orderBy: { returnDate: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          returnedBy: { select: { id: true, firstName: true, lastName: true } },
          sale: { select: { id: true, invoiceNumber: true } },
          items: { select: { quantity: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        returnNumber: row.returnNumber,
        saleId: row.saleId,
        returnDate: row.returnDate,
        customerId: row.customerId,
        subtotal: row.subtotal.toNumber(),
        taxAmount: row.taxAmount.toNumber(),
        totalAmount: row.totalAmount.toNumber(),
        refundMethod: row.refundMethod,
        reason: row.reason,
        status: row.status,
        itemCount: row.items.reduce((sum, i) => sum + i.quantity, 0),
        customer: row.customer,
        returnedBy: row.returnedBy,
        sale: row.sale,
        createdAt: row.createdAt,
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

  async create(dto: CreateSalesReturnDto, request?: Request) {
    const userId = this.currentUserId(request);

    const sale = await this.prisma.sale.findUnique({ where: { id: dto.saleId }, include: { items: true } });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status !== SaleStatus.COMPLETED && sale.status !== SaleStatus.PARTIALLY_RETURNED) {
      throw new BadRequestException('Sale is not eligible for a return');
    }

    const saleItemMap = new Map(sale.items.map((i) => [i.id, i]));
    const saleItemIds = dto.items.map((i) => i.saleItemId);
    for (const id of saleItemIds) {
      if (!saleItemMap.has(id)) throw new BadRequestException('One or more sale items do not belong to this sale');
    }

    const alreadyReturned = await this.prisma.salesReturnItem.groupBy({
      by: ['saleItemId'],
      where: { saleItemId: { in: saleItemIds } },
      _sum: { quantity: true },
    });
    const returnedMap = new Map(alreadyReturned.map((r) => [r.saleItemId, r._sum.quantity ?? 0]));

    for (const item of dto.items) {
      const saleItem = saleItemMap.get(item.saleItemId)!;
      const returned = returnedMap.get(item.saleItemId) ?? 0;
      if (item.quantity > saleItem.quantity - returned) {
        throw new ConflictException(
          `Return quantity exceeds the remaining quantity for ${saleItem.productId} (max ${saleItem.quantity - returned})`,
        );
      }
    }

    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();
    const salesReturn = await this.prisma.$transaction(async (tx) => {
      const returnNumber = await this.numbering.generate('saleReturn', returnDate);

      const restockBatch = await this.restock(tx, dto, saleItemMap, returnNumber, userId);

      const subtotal = dto.items.reduce((sum, i) => sum + i.quantity * Number(saleItemMap.get(i.saleItemId)!.unitPrice), 0);

      const created = await tx.salesReturn.create({
        data: {
          returnNumber,
          saleId: sale.id,
          returnDate,
          customerId: sale.customerId,
          subtotal,
          totalAmount: subtotal,
          refundMethod: dto.refundMethod ?? null,
          reason: dto.reason,
          status: 'COMPLETED',
          returnedById: userId ?? '',
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              saleItemId: item.saleItemId,
              productId: saleItemMap.get(item.saleItemId)!.productId,
              batchId: restockBatch.get(item.saleItemId) ?? null,
              quantity: item.quantity,
              unitPrice: saleItemMap.get(item.saleItemId)!.unitPrice,
              totalPrice: item.quantity * Number(saleItemMap.get(item.saleItemId)!.unitPrice),
              reason: item.reason,
            })),
          },
        },
        include: returnInclude,
      });

      await this.updateSaleState(tx, sale.id);

      return created;
    });

    void this.auditService.log({
      action: 'sales_returns.create',
      entityType: 'SalesReturn',
      entityId: salesReturn.id,
      newValue: {
        returnNumber: salesReturn.returnNumber,
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        itemCount: dto.items.length,
        totalAmount: salesReturn.totalAmount.toNumber(),
      },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(salesReturn);
  }

  async findOne(id: string) {
    const row = await this.prisma.salesReturn.findUnique({ where: { id }, include: returnInclude });
    if (!row) throw new NotFoundException('Sales return not found');
    return this.toDetail(row);
  }

  // ── Helpers ─────────────────────────────────────────────────

  private async restock(
    tx: Tx,
    dto: CreateSalesReturnDto,
    saleItemMap: Map<string, { productId: string; batchId: string | null }>,
    returnNumber: string,
    userId?: string,
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    for (const item of dto.items) {
      const saleItem = saleItemMap.get(item.saleItemId)!;
      const useBatchId = item.batchId ?? saleItem.batchId;
      let batchId: string;
      let before: number;

      if (useBatchId) {
        const batch = await tx.batch.findUnique({ where: { id: useBatchId } });
        if (!batch || batch.productId !== saleItem.productId) {
          throw new BadRequestException('Batch does not belong to the returned product');
        }
        batchId = batch.id;
        before = batch.remainingQuantity;
      } else {
        const batch = await tx.batch.findFirst({
          where: { productId: saleItem.productId },
          orderBy: { expiryDate: 'asc' },
          select: { id: true, remainingQuantity: true },
        });
        if (!batch) throw new ConflictException('Cannot restore stock: no batch exists for this product');
        batchId = batch.id;
        before = batch.remainingQuantity;
      }

      result.set(item.saleItemId, batchId);

      await tx.batch.update({
        where: { id: batchId },
        data: { remainingQuantity: { increment: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          productId: saleItem.productId,
          batchId,
          type: 'SALE_RETURN',
          quantity: item.quantity,
          beforeQuantity: before,
          afterQuantity: before + item.quantity,
          referenceType: 'SalesReturn',
          referenceId: returnNumber,
          userId: userId ?? null,
          notes: returnNumber,
        },
      });
    }

    return result;
  }

  private async updateSaleState(tx: Tx, saleId: string) {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            returnItems: { select: { quantity: true } },
          },
        },
      },
    });
    if (!sale) return;

    const allItems = sale.items;
    const anyReturned = sale.items.some((i) => i.returnItems.length > 0);
    const fullyReturned =
      allItems.length > 0 && allItems.every((i) => i.returnItems.reduce((sum, r) => sum + r.quantity, 0) >= i.quantity);

    const status = fullyReturned ? SaleStatus.RETURNED : anyReturned ? SaleStatus.PARTIALLY_RETURNED : sale.status;
    await tx.sale.update({
      where: { id: saleId },
      data: {
        status,
        ...(fullyReturned && sale.paymentStatus === PaymentStatus.PAID ? { paymentStatus: PaymentStatus.REFUNDED } : {}),
      },
    });
  }

  private toDetail(row: Prisma.SalesReturnGetPayload<{ include: typeof returnInclude }>) {
    return {
      id: row.id,
      returnNumber: row.returnNumber,
      saleId: row.saleId,
      returnDate: row.returnDate,
      customerId: row.customerId,
      subtotal: row.subtotal.toNumber(),
      taxAmount: row.taxAmount.toNumber(),
      totalAmount: row.totalAmount.toNumber(),
      refundMethod: row.refundMethod,
      reason: row.reason,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      customer: row.customer,
      returnedBy: row.returnedBy,
      sale: row.sale,
      items: row.items.map((item) => ({
        id: item.id,
        salesReturnId: item.salesReturnId,
        saleItemId: item.saleItemId,
        productId: item.productId,
        batchId: item.batchId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        reason: item.reason,
        product: item.product,
        batch: item.batch,
        saleItem: item.saleItem,
      })),
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}