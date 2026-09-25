import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PaginatedData } from '@pharmapro/shared';
import { getPagination, getSort, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

const include = {
  _count: { select: { sales: true, prescriptions: true } },
} satisfies Prisma.CustomerInclude;

export interface CustomerListItem {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  dateOfBirth?: Date | null;
  notes?: string | null;
  balance: number;
  isActive: boolean;
  salesCount: number;
  createdAt: Date;
}

export interface StatementQuery {
  dateFrom?: string;
  dateTo?: string;
}

export interface LedgerEntry {
  date: Date;
  type: 'OPENING' | 'SALE' | 'PAYMENT' | 'RETURN';
  reference: string | null;
  notes?: string | null;
  amount: number;
  balanceAfter: number;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: PaginationQuery): Promise<PaginatedData<CustomerListItem>> {
    const { skip, take } = getPagination(query);
    const where: Prisma.CustomerWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({ where, skip, take, orderBy: getSort(query) ?? { name: 'asc' }, include }),
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
    return this.prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<CustomerListItem> {
    const row = await this.prisma.customer.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Customer not found');
    return this.toListItem(row);
  }

  async statement(id: string, query: StatementQuery) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

    const range = this.dateRange(query);

    const [sales, returns, payments, salesReturns] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where: { customerId: id, ...(range ? { saleDate: range } : {}) },
        select: { id: true, saleDate: true, invoiceNumber: true, totalAmount: true, paidAmount: true },
        orderBy: { saleDate: 'asc' },
      }),
      this.prisma.salesReturn.findMany({
        where: { customerId: id, ...(range ? { returnDate: range } : {}) },
        select: { id: true, returnDate: true, returnNumber: true, totalAmount: true, reason: true },
        orderBy: { returnDate: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { customerId: id, type: 'CUSTOMER_PAYMENT', ...(range ? { date: range } : {}) },
        select: { id: true, date: true, reference: true, amount: true, notes: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.salesReturn.count({ where: { customerId: id, status: 'COMPLETED' } }),
    ]);

    const entries: Array<LedgerEntry & { id: string }> = [];
    for (const s of sales) {
      entries.push({
        id: s.id,
        date: s.saleDate,
        type: 'SALE',
        reference: s.invoiceNumber,
        notes: s.paidAmount.toNumber() > 0 ? `Paid ${s.paidAmount.toNumber()}` : null,
        amount: s.totalAmount.toNumber(),
        balanceAfter: 0,
      });
    }
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

    let running = 0;
    const transactions: LedgerEntry[] = [{ date: customer.createdAt, type: 'OPENING', reference: 'Opening balance', amount: 0, balanceAfter: 0 }];
    for (const entry of entries) {
      running += entry.amount;
      transactions.push({ ...entry, balanceAfter: running });
    }

    const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0);
    const summary = {
      openingBalance: 0,
      currentBalance: customer.balance.toNumber(),
      calculatedBalance: running,
      totalSales: sum(sales.map((s) => s.totalAmount.toNumber())),
      totalPayments: sum(payments.map((p) => p.amount.toNumber())),
      totalReturns: sum(returns.map((r) => r.totalAmount.toNumber())),
      completedReturns: salesReturns,
    };

    return {
      customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
      summary,
      transactions,
    };
  }

  async sales(id: string, query: PaginationQuery) {
    const customer = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer not found');

    const { skip, take } = getPagination(query);
    const where: Prisma.SaleWhereInput = { customerId: id };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: { saleDate: 'desc' },
        include: {
          cashier: { select: { id: true, firstName: true, lastName: true } },
          items: { select: { quantity: true } },
          payments: true,
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        saleDate: row.saleDate,
        subtotal: row.subtotal.toNumber(),
        taxAmount: row.taxAmount.toNumber(),
        discountAmount: row.discountAmount.toNumber(),
        totalAmount: row.totalAmount.toNumber(),
        paidAmount: row.paidAmount.toNumber(),
        changeAmount: row.changeAmount.toNumber(),
        paymentStatus: row.paymentStatus,
        status: row.status,
        notes: row.notes,
        createdAt: row.createdAt,
        cashier: row.cashier,
        lineCount: row.items.length || 0,
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

  private dateRange(query: StatementQuery): { gte: Date; lte?: Date } | undefined {
    const from = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const to = query.dateTo ? new Date(query.dateTo) : undefined;
    if (!from && !to) return undefined;
    if (isNaN(from?.getTime() ?? NaN) || isNaN(to?.getTime() ?? NaN)) {
      throw new BadRequestException('Invalid date range');
    }
    return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } as { gte: Date; lte?: Date };
  }

  async create(dto: CreateCustomerDto, request?: Request): Promise<CustomerListItem> {
    const existing = await this.prisma.customer.findFirst({
      where: { OR: [{ name: dto.name }, ...(dto.phone ? [{ phone: dto.phone }] : [])] },
    });
    if (existing) throw new ConflictException('A customer with this name or phone already exists');

    const row = await this.prisma.customer.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        notes: dto.notes,
      },
    });

    void this.auditService.log({
      action: 'customers.create',
      entityType: 'Customer',
      entityId: row.id,
      newValue: { name: row.name },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.findOne(row.id);
  }

  async update(id: string, dto: UpdateCustomerDto, request?: Request): Promise<CustomerListItem> {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer not found');

    const row = await this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        notes: dto.notes,
        isActive: dto.isActive,
      },
    });

    void this.auditService.log({
      action: 'customers.update',
      entityType: 'Customer',
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
    const existing = await this.prisma.customer.findUnique({ where: { id }, include });
    if (!existing) throw new NotFoundException('Customer not found');
    if (existing._count.sales > 0) {
      throw new ConflictException('Customer has sales history and cannot be deleted');
    }

    await this.prisma.customer.delete({ where: { id } });

    void this.auditService.log({
      action: 'customers.delete',
      entityType: 'Customer',
      entityId: id,
      previousValue: { name: existing.name },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return { success: true };
  }

  private toListItem(row: Prisma.CustomerGetPayload<{ include: typeof include }>): CustomerListItem {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      dateOfBirth: row.dateOfBirth,
      notes: row.notes,
      balance: row.balance.toNumber(),
      isActive: row.isActive,
      salesCount: row._count.sales,
      createdAt: row.createdAt,
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}