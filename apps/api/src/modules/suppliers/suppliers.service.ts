import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PaginatedData } from '@pharmapro/shared';
import { getPagination, getSort, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

const include = {
  _count: { select: { purchaseOrders: true, payments: true } },
} satisfies Prisma.SupplierInclude;

export interface SupplierListItem {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  openingBalance: number;
  currentBalance: number;
  notes?: string | null;
  isActive: boolean;
  purchaseOrderCount: number;
  createdAt: Date;
}

export interface StatementQuery {
  dateFrom?: string;
  dateTo?: string;
}

export interface LedgerEntry {
  date: Date;
  type: 'OPENING' | 'PURCHASE' | 'PAYMENT' | 'RETURN';
  reference: string | null;
  notes?: string | null;
  amount: number;
  balanceAfter: number;
}

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: PaginationQuery): Promise<PaginatedData<SupplierListItem>> {
    const { skip, take } = getPagination(query);
    const where: Prisma.SupplierWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { contactPerson: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({ where, skip, take, orderBy: getSort(query) ?? { name: 'asc' }, include }),
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
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<SupplierListItem> {
    const row = await this.prisma.supplier.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Supplier not found');
    return this.toListItem(row);
  }

  async statement(id: string, query: StatementQuery) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const range = this.dateRange(query);

    const [receipts, returns, payments] = await this.prisma.$transaction([
      this.prisma.purchaseReceipt.findMany({
        where: { supplierId: id, ...(range ? { receiptDate: range } : {}) },
        select: { id: true, receiptDate: true, receiptNumber: true, invoiceNumber: true, totalAmount: true },
        orderBy: { receiptDate: 'asc' },
      }),
      this.prisma.purchaseReturn.findMany({
        where: { supplierId: id, ...(range ? { returnDate: range } : {}) },
        select: { id: true, returnDate: true, returnNumber: true, totalAmount: true, reason: true },
        orderBy: { returnDate: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { supplierId: id, type: 'SUPPLIER_PAYMENT', ...(range ? { date: range } : {}) },
        select: { id: true, date: true, reference: true, amount: true, notes: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const entries: Array<LedgerEntry & { id: string }> = receipts.map((r) => ({
      id: r.id,
      date: r.receiptDate,
      type: 'PURCHASE',
      reference: r.receiptNumber,
      notes: r.invoiceNumber ? `Invoice ${r.invoiceNumber}` : null,
      amount: r.totalAmount.toNumber(),
      balanceAfter: 0,
    }));
    for (const r of returns) {
      entries.push({
        id: r.id,
        date: r.returnDate,
        type: 'RETURN',
        reference: r.returnNumber,
        notes: r.reason,
        amount: -r.totalAmount.toNumber(),
        balanceAfter: 0,
      });
    }
    for (const p of payments) {
      entries.push({
        id: p.id,
        date: p.date,
        type: 'PAYMENT',
        reference: p.reference ?? 'Payment',
        notes: p.notes,
        amount: -p.amount.toNumber(),
        balanceAfter: 0,
      });
    }
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = supplier.openingBalance.toNumber();
    const transactions: LedgerEntry[] = [{ date: supplier.createdAt, type: 'OPENING', reference: 'Opening balance', amount: running, balanceAfter: running }];
    for (const entry of entries) {
      running += entry.amount;
      transactions.push({ ...entry, balanceAfter: running });
    }

    const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0);
    const summary = {
      openingBalance: supplier.openingBalance.toNumber(),
      currentBalance: supplier.currentBalance.toNumber(),
      calculatedBalance: running,
      totalPurchases: sum(receipts.map((r) => r.totalAmount.toNumber())),
      totalPayments: sum(payments.map((p) => p.amount.toNumber())),
      totalReturns: sum(returns.map((r) => r.totalAmount.toNumber())),
    };

    return {
      supplier: { id: supplier.id, name: supplier.name, phone: supplier.phone, email: supplier.email },
      summary,
      transactions,
    };
  }

  async purchases(id: string, query: PaginationQuery) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id }, select: { id: true } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const { skip, take } = getPagination(query);
    const where: Prisma.PurchaseReceiptWhereInput = { supplierId: id };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.purchaseReceipt.count({ where }),
      this.prisma.purchaseReceipt.findMany({
        where,
        skip,
        take,
        orderBy: { receiptDate: 'desc' },
        include: {
          purchaseOrder: { select: { id: true, poNumber: true, status: true } },
          items: { select: { receivedQuantity: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        receiptNumber: row.receiptNumber,
        receiptDate: row.receiptDate,
        invoiceNumber: row.invoiceNumber,
        invoiceDate: row.invoiceDate,
        subtotal: row.subtotal.toNumber(),
        taxAmount: row.taxAmount.toNumber(),
        discountAmount: row.discountAmount.toNumber(),
        totalAmount: row.totalAmount.toNumber(),
        notes: row.notes,
        createdAt: row.createdAt,
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

  private dateRange(query: StatementQuery): { gte: Date; lte?: Date } | undefined {
    const from = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const to = query.dateTo ? new Date(query.dateTo) : undefined;
    if (!from && !to) return undefined;
    if (isNaN(from?.getTime() ?? NaN) || isNaN(to?.getTime() ?? NaN)) {
      throw new BadRequestException('Invalid date range');
    }
    return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } as { gte: Date; lte?: Date };
  }

  async create(dto: CreateSupplierDto, request?: Request): Promise<SupplierListItem> {
    const dup = await this.prisma.supplier.findFirst({ where: { name: dto.name } });
    if (dup) throw new ConflictException('Supplier name already exists');

    const row = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        taxNumber: dto.taxNumber,
        openingBalance: dto.openingBalance ?? 0,
        currentBalance: dto.openingBalance ?? 0,
        notes: dto.notes,
      },
    });

    void this.auditService.log({
      action: 'suppliers.create',
      entityType: 'Supplier',
      entityId: row.id,
      newValue: { name: row.name },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.findOne(row.id);
  }

  async update(id: string, dto: UpdateSupplierDto, request?: Request): Promise<SupplierListItem> {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Supplier not found');

    const row = await this.prisma.supplier.update({ where: { id }, data: dto });

    void this.auditService.log({
      action: 'suppliers.update',
      entityType: 'Supplier',
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
    const existing = await this.prisma.supplier.findUnique({ where: { id }, include });
    if (!existing) throw new NotFoundException('Supplier not found');
    if (existing._count.purchaseOrders > 0) {
      throw new BadRequestException('Supplier has purchase orders and cannot be deleted');
    }

    await this.prisma.supplier.delete({ where: { id } });

    void this.auditService.log({
      action: 'suppliers.delete',
      entityType: 'Supplier',
      entityId: id,
      previousValue: { name: existing.name },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return { success: true };
  }

  private toListItem(row: Prisma.SupplierGetPayload<{ include: typeof include }>): SupplierListItem {
    return {
      id: row.id,
      name: row.name,
      contactPerson: row.contactPerson,
      phone: row.phone,
      email: row.email,
      address: row.address,
      taxNumber: row.taxNumber,
      openingBalance: row.openingBalance.toNumber(),
      currentBalance: row.currentBalance.toNumber(),
      notes: row.notes,
      isActive: row.isActive,
      purchaseOrderCount: row._count.purchaseOrders,
      createdAt: row.createdAt,
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}