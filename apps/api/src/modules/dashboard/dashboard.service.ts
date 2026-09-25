import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const r2 = (n: number) => Math.round(n * 100) / 100;

const SALE_STATUSES: NonNullable<Prisma.SaleWhereInput['status']> = ['COMPLETED', 'PARTIALLY_RETURNED', 'RETURNED'] as any;

function dayStart(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function periodRange(period: 'today' | 'week' | 'month'): { start: Date; end: Date } {
  const now = new Date();
  const start = dayStart(now);
  if (period === 'today') return { start, end: addDays(start, 1) };
  if (period === 'week') return { start: dayStart(addDays(now, -(now.getDay() + 6) % 7)), end: addDays(start, 7) };
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}

export type DashboardPeriod = 'today' | 'week' | 'month';
export type ChartRange = 'week' | 'month' | 'year';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const periods: DashboardPeriod[] = ['today', 'week', 'month'];
    const result: Record<string, unknown> = {};
    for (const period of periods) {
      result[period] = await this.kpis(periodRange(period));
    }
    return result;
  }

  private async kpis({ start, end }: { start: Date; end: Date }) {
    const [saleRows, expenseAgg, receiptAgg, customerCount, prescriptionCount, returnAgg, unpaidAgg] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where: { saleDate: { gte: start, lt: end }, status: { in: SALE_STATUSES } as any },
        include: { items: { include: { batch: true, product: true } } },
      }),
      this.prisma.expense.aggregate({ where: { date: { gte: start, lt: end }, status: 'APPROVED' }, _sum: { amount: true } }),
      this.prisma.purchaseReceipt.aggregate({ where: { receiptDate: { gte: start, lt: end } }, _sum: { totalAmount: true } }),
      this.prisma.customer.count({ where: { createdAt: { gte: start, lt: end } } }),
      this.prisma.prescription.count({ where: { createdAt: { gte: start, lt: end } } }),
      this.prisma.salesReturn.aggregate({ where: { returnDate: { gte: start, lt: end } }, _sum: { totalAmount: true } }),
      this.prisma.sale.aggregate({
        where: { saleDate: { gte: start, lt: end }, paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] } as any },
        _count: { id: true },
        _sum: { totalAmount: true, paidAmount: true },
      }),
    ]);

    let revenue = 0;
    let cost = 0;
    for (const sale of saleRows) {
      revenue += Number(sale.totalAmount);
      for (const item of sale.items) {
        const unitCost = item.batch ? Number(item.batch.purchasePrice) : Number(item.product.purchasePrice);
        cost += item.quantity * unitCost;
      }
    }
    const salesCount = saleRows.length;

    return {
      salesCount,
      salesAmount: r2(revenue),
      profit: r2(revenue - cost),
      avgOrderValue: salesCount > 0 ? r2(revenue / salesCount) : 0,
      paidAmount: r2(saleRows.reduce((s, r) => s + Number(r.paidAmount), 0)),
      expensesAmount: r2(Number(expenseAgg._sum.amount ?? 0)),
      purchaseAmount: r2(Number(receiptAgg._sum.totalAmount ?? 0)),
      returnedAmount: r2(Number(returnAgg._sum.totalAmount ?? 0)),
      newCustomers: customerCount,
      prescriptionCount,
      unpaidInvoices: unpaidAgg._count.id,
      unpaidAmount: r2(Number(unpaidAgg._sum.totalAmount ?? 0) - Number(unpaidAgg._sum.paidAmount ?? 0)),
    };
  }

  async salesChart(range: ChartRange = 'week') {
    const now = new Date();
    let start: Date;
    let bucketFmt: 'day' | 'month';
    if (range === 'year') {
      start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      bucketFmt = 'month';
    } else {
      start = range === 'week' ? dayStart(addDays(now, -6)) : dayStart(addDays(now, -29));
      bucketFmt = 'day';
    }

    const sales = await this.prisma.sale.findMany({
      where: { saleDate: { gte: start }, status: { in: SALE_STATUSES } as any },
      include: { items: { include: { batch: true, product: true } } },
    });

    const buckets = new Map<string, { label: string; count: number; amount: number; profit: number }>();
    const addBucket = (label: string) => {
      if (!buckets.has(label)) buckets.set(label, { label, count: 0, amount: 0, profit: 0 });
      return buckets.get(label)!;
    };

    if (bucketFmt === 'day') {
      for (let i = 0; i < (range === 'week' ? 7 : 30); i++) {
        const d = addDays(start, i);
        addBucket(d.toISOString().slice(0, 10));
      }
      for (const sale of sales) {
        const label = sale.saleDate.toISOString().slice(0, 10);
        const bucket = addBucket(label);
        bucket.count += 1;
        bucket.amount = r2(bucket.amount + Number(sale.totalAmount));
        let cost = 0;
        for (const item of sale.items) {
          cost += item.quantity * (item.batch ? Number(item.batch.purchasePrice) : Number(item.product.purchasePrice));
        }
        bucket.profit = r2(bucket.profit + Number(sale.totalAmount) - cost);
      }
      return Array.from(buckets.values());
    }

    for (let i = 0; i < 12; i++) {
      const d = addMonths(new Date(now.getFullYear() - 1, now.getMonth(), 1), i);
      addBucket(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    for (const sale of sales) {
      const label = `${sale.saleDate.getFullYear()}-${String(sale.saleDate.getMonth() + 1).padStart(2, '0')}`;
      const bucket = addBucket(label);
      bucket.count += 1;
      bucket.amount = r2(bucket.amount + Number(sale.totalAmount));
      let cost = 0;
      for (const item of sale.items) {
        cost += item.quantity * (item.batch ? Number(item.batch.purchasePrice) : Number(item.product.purchasePrice));
      }
      bucket.profit = r2(bucket.profit + Number(sale.totalAmount) - cost);
    }
    return Array.from(buckets.values());
  }

  async topProducts(period: DashboardPeriod = 'month', limit = 5) {
    const { start, end } = periodRange(period);
    const items = await this.prisma.saleItem.findMany({
      where: { sale: { saleDate: { gte: start, lt: end }, status: { in: SALE_STATUSES } as any } },
      select: { quantity: true, totalPrice: true, product: { select: { id: true, name: true, sku: true } } },
    });
    const grouped = new Map<string, { product: string; sku: string; quantity: number; revenue: number; count: number }>();
    for (const item of items) {
      const key = item.product.id;
      const entry = grouped.get(key) ?? { product: item.product.name, sku: item.product.sku ?? '—', quantity: 0, revenue: 0, count: 0 };
      entry.quantity += item.quantity;
      entry.revenue = r2(entry.revenue + Number(item.totalPrice));
      entry.count += 1;
      grouped.set(key, entry);
    }
    return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  }

  async categories(period: DashboardPeriod = 'month') {
    const { start, end } = periodRange(period);
    const items = await this.prisma.saleItem.findMany({
      where: { sale: { saleDate: { gte: start, lt: end }, status: { in: SALE_STATUSES } as any } },
      select: { quantity: true, totalPrice: true, product: { select: { category: { select: { id: true, name: true } } } } },
    });
    const grouped = new Map<string, { category: string; quantity: number; revenue: number; salesCount: number }>();
    for (const item of items) {
      const key = item.product.category?.id ?? 'uncategorized';
      const name = item.product.category?.name ?? 'Uncategorized';
      const entry = grouped.get(key) ?? { category: name, quantity: 0, revenue: 0, salesCount: 0 };
      entry.quantity += item.quantity;
      entry.revenue = r2(entry.revenue + Number(item.totalPrice));
      entry.salesCount += 1;
      grouped.set(key, entry);
    }
    return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue);
  }

  async alerts() {
    const now = new Date();
    const soon = addDays(now, 30);
    const [products, batches, pendingExpenses, pendingAdjustments, pendingPOs] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where: { isActive: true, deletedAt: null }, select: { id: true, name: true, sku: true, reorderLevel: true, category: { select: { name: true } } } }),
      this.prisma.batch.findMany({
        where: { remainingQuantity: { gt: 0 }, expiryDate: { lt: soon } },
        orderBy: { expiryDate: 'asc' },
        select: { id: true, batchNumber: true, expiryDate: true, remainingQuantity: true, product: { select: { name: true, sku: true } } },
      }),
      this.prisma.expense.count({ where: { status: 'PENDING' } }),
      this.prisma.stockAdjustment.count({ where: { status: 'PENDING' } }),
      this.prisma.purchaseOrder.count({ where: { status: 'PENDING_APPROVAL' } }),
    ]);

    const stockById = new Map<string, number>();
    const batchRows = await this.prisma.batch.findMany({ select: { productId: true, remainingQuantity: true } });
    for (const b of batchRows) stockById.set(b.productId, (stockById.get(b.productId) ?? 0) + b.remainingQuantity);

    const lowStock = products
      .filter((p) => (stockById.get(p.id) ?? 0) <= p.reorderLevel)
      .map((p) => ({ name: p.name, sku: p.sku ?? '—', category: p.category?.name ?? '—', stock: stockById.get(p.id) ?? 0, reorderLevel: p.reorderLevel }))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10);

    const expiring = batches.filter((b) => b.expiryDate > now).map((b) => ({ batchNumber: b.batchNumber, product: b.product.name, sku: b.product.sku ?? '—', expiresInDays: Math.ceil((b.expiryDate.getTime() - now.getTime()) / 86_400_000), quantity: b.remainingQuantity }));
    const expired = batches.filter((b) => b.expiryDate <= now).map((b) => ({ batchNumber: b.batchNumber, product: b.product.name, sku: b.product.sku ?? '—', expiredDaysAgo: Math.floor((now.getTime() - b.expiryDate.getTime()) / 86_400_000), quantity: b.remainingQuantity }));

    return {
      lowStock,
      expiring,
      expired,
      pendingExpenses,
      pendingAdjustments,
      pendingApprovalPOs: pendingPOs,
    };
  }
}