import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, PurchaseOrder } from '@prisma/client';
import { getPagination, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { NumberingService } from '../../common/services/numbering.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseOrderDto, CreatePurchaseOrderItemDto } from './dto/purchase-order.dto';

const orderInclude = {
  supplier: { select: { id: true, name: true, phone: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  items: {
    include: { product: { select: { id: true, name: true, sku: true } } },
  },
  receipts: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      receiptNumber: true,
      receiptDate: true,
      totalAmount: true,
    },
  },
} satisfies Prisma.PurchaseOrderInclude;

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeOrderTotals(items: CreatePurchaseOrderItemDto[], headerDiscount = 0) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let total = 0;

  for (const item of items) {
    const line = item.quantity * item.unitPrice;
    const lineDiscount = (line * (item.discount ?? 0)) / 100;
    const lineTax = ((line - lineDiscount) * (item.taxRate ?? 0)) / 100;
    subtotal += line;
    discountTotal += lineDiscount;
    taxTotal += lineTax;
    total += line - lineDiscount + lineTax;
  }

  discountTotal += headerDiscount;

  return {
    subtotal: r2(subtotal),
    discountAmount: r2(discountTotal),
    taxAmount: r2(taxTotal),
    totalAmount: r2(subtotal - discountTotal + taxTotal),
  };
}

type OrderWithRelations = Prisma.PurchaseOrderGetPayload<{ include: typeof orderInclude }>;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly numbering: NumberingService,
  ) {}

  async findAll(query: PaginationQuery & { status?: string; supplierId?: string; search?: string }) {
    const { skip, take } = getPagination(query);

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.status ? { status: query.status as PurchaseOrder['status'] } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.search
        ? {
            OR: [
              { poNumber: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
              { notes: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
          items: { select: { quantity: true, receivedQuantity: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        poNumber: row.poNumber,
        supplierId: row.supplierId,
        orderDate: row.orderDate,
        expectedDeliveryDate: row.expectedDeliveryDate,
        status: row.status,
        subtotal: row.subtotal.toNumber(),
        taxAmount: row.taxAmount.toNumber(),
        discountAmount: row.discountAmount.toNumber(),
        totalAmount: row.totalAmount.toNumber(),
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        supplier: row.supplier,
        createdBy: row.createdBy,
        approvedBy: row.approvedBy,
        receivedProgress: this.progress(row.items),
      })),
      meta: this.meta(query, total, take),
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: orderInclude });
    if (!row) throw new NotFoundException('Purchase order not found');
    return this.toDetail(row);
  }

  async create(dto: CreatePurchaseOrderDto, request?: Request) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier || !supplier.isActive) throw new NotFoundException('Supplier not found');

    await this.validateItems(dto.items);
    const taxRate = dto.items.every((i) => i.taxRate === undefined) ? await this.resolveVatRate() : undefined;
    const items = dto.items.map((item) => ({
      ...item,
      taxRate: item.taxRate ?? (taxRate ?? 0),
      totalPrice: this.lineTotal(item.quantity, item.unitPrice, item.discount ?? 0, item.taxRate ?? taxRate ?? 0),
    }));
    const totals = computeOrderTotals(items, dto.discountAmount ?? 0);
    const poNumber = await this.numbering.generate('purchaseOrder');

    const row = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: dto.supplierId,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        createdById: this.currentUserId(request) ?? '',
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        notes: dto.notes,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount ?? 0,
            taxRate: item.taxRate ?? 0,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: orderInclude,
    });

    void this.auditService.log({
      action: 'purchase_orders.create',
      entityType: 'PurchaseOrder',
      entityId: row.id,
      newValue: { poNumber, supplierId: dto.supplierId, totalAmount: totals.totalAmount, status: 'DRAFT' },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(row);
  }

  async update(id: string, dto: Partial<CreatePurchaseOrderDto>, request?: Request) {
    const existing = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new NotFoundException('Purchase order not found');
    if (existing.status !== 'DRAFT') throw new BadRequestException('Only draft purchase orders can be edited');

    if (dto.supplierId !== undefined) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
      if (!supplier || !supplier.isActive) throw new NotFoundException('Supplier not found');
    }

    const items = dto.items ?? existing.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toNumber(),
      discount: i.discount.toNumber(),
      taxRate: i.taxRate.toNumber(),
    }));
    await this.validateItems(items);

    const normalized = items.map((item) => ({
      ...item,
      taxRate: item.taxRate ?? 0,
      totalPrice: this.lineTotal(item.quantity, item.unitPrice, item.discount ?? 0, item.taxRate ?? 0),
    }));
    const totals = computeOrderTotals(normalized, dto.discountAmount ?? 0);

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: dto.supplierId ?? existing.supplierId,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : existing.orderDate,
          expectedDeliveryDate: dto.expectedDeliveryDate !== undefined ? (dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null) : existing.expectedDeliveryDate,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          items: {
            create: normalized.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount ?? 0,
              taxRate: item.taxRate ?? 0,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: orderInclude,
      });
    });

    void this.auditService.log({
      action: 'purchase_orders.update',
      entityType: 'PurchaseOrder',
      entityId: id,
      newValue: { poNumber: row.poNumber, totalAmount: totals.totalAmount },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(row);
  }

  async submit(id: string, request?: Request) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (order.status !== 'DRAFT') throw new BadRequestException('Only draft purchase orders can be submitted');

    const row = await this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'PENDING_APPROVAL' }, include: orderInclude });

    void this.auditService.log({
      action: 'purchase_orders.submit',
      entityType: 'PurchaseOrder',
      entityId: id,
      newValue: { poNumber: row.poNumber, status: 'PENDING_APPROVAL' },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(row);
  }

  async approve(id: string, request?: Request) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (order.status !== 'PENDING_APPROVAL') throw new BadRequestException('Only pending-approval purchase orders can be approved');
    const approverId = this.currentUserId(request);

    const row = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: approverId ?? null, approvedAt: new Date() },
      include: orderInclude,
    });

    void this.auditService.log({
      action: 'purchase_orders.approve',
      entityType: 'PurchaseOrder',
      entityId: id,
      newValue: { poNumber: row.poNumber, status: 'APPROVED', approvedById: approverId },
      userId: approverId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(row);
  }

  async reject(id: string, request?: Request) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (order.status !== 'PENDING_APPROVAL') throw new BadRequestException('Only pending-approval purchase orders can be rejected');

    const row = await this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'DRAFT' }, include: orderInclude });

    void this.auditService.log({
      action: 'purchase_orders.reject',
      entityType: 'PurchaseOrder',
      entityId: id,
      newValue: { poNumber: row.poNumber, status: 'DRAFT' },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(row);
  }

  async cancel(id: string, request?: Request) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (!['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(order.status)) {
      throw new BadRequestException('This purchase order cannot be cancelled in its current state');
    }

    const row = await this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' }, include: orderInclude });

    void this.auditService.log({
      action: 'purchase_orders.cancel',
      entityType: 'PurchaseOrder',
      entityId: id,
      newValue: { poNumber: row.poNumber, status: 'CANCELLED' },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(row);
  }

  // ── Helpers ─────────────────────────────────────────────────

  private toDetail(row: OrderWithRelations) {
    return {
      id: row.id,
      poNumber: row.poNumber,
      supplierId: row.supplierId,
      orderDate: row.orderDate,
      expectedDeliveryDate: row.expectedDeliveryDate,
      status: row.status,
      subtotal: row.subtotal.toNumber(),
      taxAmount: row.taxAmount.toNumber(),
      discountAmount: row.discountAmount.toNumber(),
      totalAmount: row.totalAmount.toNumber(),
      notes: row.notes,
      createdById: row.createdById,
      approvedById: row.approvedById,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      supplier: row.supplier,
      createdBy: row.createdBy,
      approvedBy: row.approvedBy,
      items: row.items.map((item) => ({
        id: item.id,
        purchaseOrderId: item.purchaseOrderId,
        productId: item.productId,
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
        unitPrice: item.unitPrice.toNumber(),
        discount: item.discount.toNumber(),
        taxRate: item.taxRate.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        product: item.product,
      })),
      receipts: row.receipts.map((receipt) => ({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        receiptDate: receipt.receiptDate,
        totalAmount: receipt.totalAmount.toNumber(),
      })),
    };
  }

  private progress(items: Array<{ quantity: number; receivedQuantity: number }>) {
    const total = items.reduce((sum, i) => sum + i.quantity, 0);
    if (total === 0) return 0;
    const received = items.reduce((sum, i) => sum + i.receivedQuantity, 0);
    return Math.round((received / total) * 100);
  }

  private lineTotal(quantity: number, unitPrice: number, discount: number, taxRate: number) {
    const line = quantity * unitPrice;
    const lineDiscount = (line * discount) / 100;
    return r2((line - lineDiscount) * (1 + taxRate / 100));
  }

  private async validateItems(items: Array<{ productId: string; quantity: number; unitPrice: number }>) {
    const ids = [...new Set(items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (products.length !== ids.length) {
      throw new BadRequestException('One or more products are invalid or inactive');
    }
  }

  private async resolveVatRate(): Promise<number> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'vat_rate' } });
    const value = Number(setting?.value ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private meta(query: PaginationQuery, total: number, take: number) {
    return {
      page: Number(query.page) || 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
      hasNextPage: (Number(query.page) || 1) * take < total,
      hasPrevPage: (Number(query.page) || 1) > 1,
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}