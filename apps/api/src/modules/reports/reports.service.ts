import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const REPORT_TYPES = [
  'sales',
  'purchases',
  'profit',
  'product-sales',
  'category-sales',
  'customers',
  'suppliers',
  'inventory',
  'stock-movements',
  'low-stock',
  'expiry',
  'expired',
  'purchase-returns',
  'sales-returns',
  'expenses',
  'cash-register',
  'payments',
  'tax',
  'user-activity',
  'prescriptions',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'end';
}

export interface ReportDefinition {
  type: string;
  title: string;
  description: string;
  requiresDateRange: boolean;
  columns: ReportColumn[];
}

export interface ReportResult {
  type: string;
  title: string;
  description: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals?: { key: string; label: string; value: number }[];
  generatedAt: string;
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const n2 = (d: { toNumber: () => number } | null | undefined) => (d ? d.toNumber() : 0);
const userName = (u: { firstName?: string; lastName?: string } | null | undefined) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '—');

const SALE_STATUSES = ['COMPLETED', 'PARTIALLY_RETURNED', 'RETURNED'] as Prisma.EnumSaleStatusFilter['in'];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly catalog: Omit<ReportDefinition, 'type'>[] = [
    { title: 'Sales Report', description: 'Invoices with totals and payment status', requiresDateRange: true, columns: [{ key: 'invoiceNumber', label: 'Invoice #' }, { key: 'saleDate', label: 'Date' }, { key: 'customer', label: 'Customer' }, { key: 'cashier', label: 'Cashier' }, { key: 'totalAmount', label: 'Total', align: 'end' }, { key: 'paidAmount', label: 'Paid', align: 'end' }, { key: 'paymentStatus', label: 'Payment Status' }, { key: 'status', label: 'Status' }] },
    { title: 'Purchases Report', description: 'Purchase orders with supplier and totals', requiresDateRange: true, columns: [{ key: 'poNumber', label: 'PO #' }, { key: 'orderDate', label: 'Date' }, { key: 'supplier', label: 'Supplier' }, { key: 'status', label: 'Status' }, { key: 'totalAmount', label: 'Total', align: 'end' }, { key: 'approvedBy', label: 'Approved By' }] },
    { title: 'Profit & Loss', description: 'Revenue, cost and profit per invoice', requiresDateRange: true, columns: [{ key: 'invoiceNumber', label: 'Invoice #' }, { key: 'saleDate', label: 'Date' }, { key: 'revenue', label: 'Revenue', align: 'end' }, { key: 'cost', label: 'Cost', align: 'end' }, { key: 'profit', label: 'Profit', align: 'end' }, { key: 'margin', label: 'Margin', align: 'end' }] },
    { title: 'Product Sales', description: 'Units and revenue per product', requiresDateRange: true, columns: [{ key: 'product', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'category', label: 'Category' }, { key: 'quantity', label: 'Qty Sold', align: 'end' }, { key: 'revenue', label: 'Revenue', align: 'end' }, { key: 'salesCount', label: 'Invoices', align: 'end' }] },
    { title: 'Category Performance', description: 'Sales grouped by category', requiresDateRange: true, columns: [{ key: 'category', label: 'Category' }, { key: 'quantity', label: 'Qty Sold', align: 'end' }, { key: 'revenue', label: 'Revenue', align: 'end' }, { key: 'salesCount', label: 'Invoices', align: 'end' }] },
    { title: 'Customer Report', description: 'Spend, payments and balances per customer', requiresDateRange: true, columns: [{ key: 'name', label: 'Customer' }, { key: 'phone', label: 'Phone' }, { key: 'salesCount', label: 'Sales', align: 'end' }, { key: 'totalSpent', label: 'Spent', align: 'end' }, { key: 'totalPaid', label: 'Paid', align: 'end' }, { key: 'balance', label: 'Balance', align: 'end' }, { key: 'lastSale', label: 'Last Sale' }] },
    { title: 'Supplier Report', description: 'Orders, purchases and balances per supplier', requiresDateRange: true, columns: [{ key: 'name', label: 'Supplier' }, { key: 'contactPerson', label: 'Contact' }, { key: 'phone', label: 'Phone' }, { key: 'ordersCount', label: 'Orders', align: 'end' }, { key: 'totalPurchases', label: 'Purchases', align: 'end' }, { key: 'balance', label: 'Balance', align: 'end' }] },
    { title: 'Inventory Report', description: 'Current stock levels and values', requiresDateRange: false, columns: [{ key: 'name', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'category', label: 'Category' }, { key: 'stock', label: 'Stock', align: 'end' }, { key: 'purchaseValue', label: 'Cost Value', align: 'end' }, { key: 'sellingValue', label: 'Selling Value', align: 'end' }, { key: 'reorderLevel', label: 'Reorder', align: 'end' }] },
    { title: 'Stock Movements', description: 'Movement history with before/after quantities', requiresDateRange: true, columns: [{ key: 'date', label: 'Date' }, { key: 'product', label: 'Product' }, { key: 'batch', label: 'Batch' }, { key: 'type', label: 'Type' }, { key: 'quantity', label: 'Qty', align: 'end' }, { key: 'before', label: 'Before', align: 'end' }, { key: 'after', label: 'After', align: 'end' }, { key: 'user', label: 'User' }] },
    { title: 'Low Stock', description: 'Products at or below reorder level', requiresDateRange: false, columns: [{ key: 'name', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'category', label: 'Category' }, { key: 'stock', label: 'Stock', align: 'end' }, { key: 'reorderLevel', label: 'Reorder', align: 'end' }] },
    { title: 'Expiry Status', description: 'Batches expiring within 90 days', requiresDateRange: false, columns: [{ key: 'batchNumber', label: 'Batch' }, { key: 'product', label: 'Product' }, { key: 'expiryDate', label: 'Expiry Date' }, { key: 'daysLeft', label: 'Days Left', align: 'end' }, { key: 'quantity', label: 'Qty', align: 'end' }] },
    { title: 'Expired Products', description: 'Batches past their expiry date', requiresDateRange: false, columns: [{ key: 'batchNumber', label: 'Batch' }, { key: 'product', label: 'Product' }, { key: 'expiryDate', label: 'Expiry Date' }, { key: 'quantity', label: 'Qty', align: 'end' }] },
    { title: 'Purchase Returns', description: 'Returns to suppliers', requiresDateRange: true, columns: [{ key: 'returnNumber', label: 'Return #' }, { key: 'returnDate', label: 'Date' }, { key: 'supplier', label: 'Supplier' }, { key: 'totalAmount', label: 'Total', align: 'end' }, { key: 'reason', label: 'Reason' }] },
    { title: 'Sales Returns', description: 'Customer returns and refunds', requiresDateRange: true, columns: [{ key: 'returnNumber', label: 'Return #' }, { key: 'returnDate', label: 'Date' }, { key: 'saleNumber', label: 'Invoice #' }, { key: 'customer', label: 'Customer' }, { key: 'totalAmount', label: 'Total', align: 'end' }, { key: 'refundMethod', label: 'Refund Method' }, { key: 'reason', label: 'Reason' }] },
    { title: 'Expense Analysis', description: 'Expenses by category and status', requiresDateRange: true, columns: [{ key: 'date', label: 'Date' }, { key: 'category', label: 'Category' }, { key: 'description', label: 'Description' }, { key: 'amount', label: 'Amount', align: 'end' }, { key: 'paymentMethod', label: 'Payment' }, { key: 'status', label: 'Status' }, { key: 'createdBy', label: 'Created By' }, { key: 'approvedBy', label: 'Approved By' }] },
    { title: 'Cash Register', description: 'Cash sessions and reconciliation', requiresDateRange: true, columns: [{ key: 'register', label: 'Register' }, { key: 'user', label: 'User' }, { key: 'openedAt', label: 'Opened' }, { key: 'closedAt', label: 'Closed' }, { key: 'openingBalance', label: 'Opening', align: 'end' }, { key: 'expectedClosingBalance', label: 'Expected', align: 'end' }, { key: 'closingBalance', label: 'Closing', align: 'end' }, { key: 'difference', label: 'Difference', align: 'end' }, { key: 'status', label: 'Status' }] },
    { title: 'Payment Transactions', description: 'All recorded payments', requiresDateRange: true, columns: [{ key: 'id', label: 'ID' }, { key: 'date', label: 'Date' }, { key: 'type', label: 'Type' }, { key: 'entity', label: 'Entity' }, { key: 'amount', label: 'Amount', align: 'end' }, { key: 'paymentMethod', label: 'Payment' }, { key: 'reference', label: 'Reference' }, { key: 'user', label: 'User' }] },
    { title: 'Tax Report', description: 'VAT collected per invoice', requiresDateRange: true, columns: [{ key: 'invoiceNumber', label: 'Invoice #' }, { key: 'saleDate', label: 'Date' }, { key: 'subtotal', label: 'Subtotal', align: 'end' }, { key: 'taxAmount', label: 'VAT', align: 'end' }, { key: 'total', label: 'Total', align: 'end' }] },
    { title: 'User Activity', description: 'Audit trail of system actions', requiresDateRange: true, columns: [{ key: 'date', label: 'Date' }, { key: 'user', label: 'User' }, { key: 'action', label: 'Action' }, { key: 'entityType', label: 'Entity' }, { key: 'entityId', label: 'Entity ID' }] },
    { title: 'Prescriptions', description: 'Prescription dispensing activity', requiresDateRange: true, columns: [{ key: 'prescriptionNumber', label: 'Rx #' }, { key: 'issueDate', label: 'Issue Date' }, { key: 'customer', label: 'Customer' }, { key: 'doctor', label: 'Doctor' }, { key: 'itemCount', label: 'Items', align: 'end' }, { key: 'totalQuantity', label: 'Total Qty', align: 'end' }, { key: 'dispensedQuantity', label: 'Dispensed', align: 'end' }, { key: 'status', label: 'Status' }, { key: 'dispensedBy', label: 'Dispensed By' }] },
  ];

  listDefinitions(): (ReportDefinition & { type: string })[] {
    return this.catalog.map((def, i) => ({ ...def, type: REPORT_TYPES[i] }));
  }

  async generate(type: string, filters: ReportFilters = {}): Promise<ReportResult> {
    const index = REPORT_TYPES.indexOf(type as ReportType);
    if (index < 0) throw new BadRequestException(`Unknown report type: ${type}`);
    const definition = { ...this.catalog[index], type };

    const limit = Math.min(Math.max(filters.limit ?? 500, 1), 2000);
    const end = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : new Date();
    const defaultStart = new Date(end.getTime() - 30 * 86_400_000);
    const start = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`) : defaultStart;

    const { rows, totals } = await this.build(type, { start, end, limit });
    return {
      type,
      title: definition.title,
      description: definition.description,
      columns: definition.columns,
      rows,
      totals,
      generatedAt: new Date().toISOString(),
    };
  }

  private async build(type: string, { start, end, limit }: { start: Date; end: Date; limit: number }): Promise<{ rows: Record<string, unknown>[]; totals?: ReportResult['totals'] }> {
    switch (type) {
      case 'sales':
        return this.sales(start, end, limit);
      case 'purchases':
        return this.purchases(start, end, limit);
      case 'profit':
        return this.profit(start, end, limit);
      case 'product-sales':
        return this.productSales(start, end, limit);
      case 'category-sales':
        return this.categorySales(start, end, limit);
      case 'customers':
        return this.customers(start, end, limit);
      case 'suppliers':
        return this.suppliers(start, end, limit);
      case 'inventory':
        return this.inventory();
      case 'stock-movements':
        return this.stockMovements(start, end, limit);
      case 'low-stock':
        return this.lowStock();
      case 'expiry':
        return this.expiry();
      case 'expired':
        return this.expired();
      case 'purchase-returns':
        return this.purchaseReturns(start, end, limit);
      case 'sales-returns':
        return this.salesReturns(start, end, limit);
      case 'expenses':
        return this.expenses(start, end, limit);
      case 'cash-register':
        return this.cashRegister(start, end, limit);
      case 'payments':
        return this.payments(start, end, limit);
      case 'tax':
        return this.tax(start, end, limit);
      case 'user-activity':
        return this.userActivity(start, end, limit);
      case 'prescriptions':
        return this.prescriptions(start, end, limit);
      default:
        throw new BadRequestException(`Unknown report type: ${type}`);
    }
  }

  // ── Report builders ────────────────────────────────────────────

  private async sales(start: Date, end: Date, take: number) {
    const sales = await this.prisma.sale.findMany({
      where: { saleDate: { gte: start, lte: end } },
      orderBy: { saleDate: 'desc' },
      take,
      include: { customer: true, cashier: { select: { firstName: true, lastName: true } } },
    });
    return {
      rows: sales.map((s) => ({
        invoiceNumber: s.invoiceNumber,
        saleDate: s.saleDate.toISOString().slice(0, 10),
        customer: s.customer?.name ?? '—',
        cashier: userName(s.cashier),
        totalAmount: n2(s.totalAmount),
        paidAmount: n2(s.paidAmount),
        paymentStatus: s.paymentStatus,
        status: s.status,
      })),
      totals: [
        { key: 'totalAmount', label: 'Total Sales', value: r2(sales.reduce((x, s) => x + n2(s.totalAmount), 0)) },
        { key: 'paidAmount', label: 'Total Paid', value: r2(sales.reduce((x, s) => x + n2(s.paidAmount), 0)) },
      ],
    };
  }

  private async purchases(start: Date, end: Date, take: number) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { orderDate: { gte: start, lte: end } },
      orderBy: { orderDate: 'desc' },
      take,
      include: { supplier: true, approvedBy: { select: { firstName: true, lastName: true } } },
    });
    return {
      rows: orders.map((o) => ({
        poNumber: o.poNumber,
        orderDate: o.orderDate.toISOString().slice(0, 10),
        supplier: o.supplier.name,
        status: o.status,
        totalAmount: n2(o.totalAmount),
        approvedBy: userName(o.approvedBy),
      })),
      totals: [{ key: 'totalAmount', label: 'Total Purchases', value: r2(orders.reduce((x, o) => x + n2(o.totalAmount), 0)) }],
    };
  }

  private async profit(start: Date, end: Date, take: number) {
    const sales = await this.prisma.sale.findMany({
      where: { saleDate: { gte: start, lte: end }, status: { in: SALE_STATUSES } },
      orderBy: { saleDate: 'desc' },
      take,
      include: { items: { include: { batch: true, product: true } } },
    });
    const rows: Record<string, unknown>[] = [];
    let totalRevenue = 0;
    let totalCost = 0;
    for (const s of sales) {
      let cost = 0;
      for (const item of s.items) cost += item.quantity * (item.batch ? n2(item.batch.purchasePrice) : n2(item.product.purchasePrice));
      const revenue = n2(s.totalAmount);
      const profitValue = r2(revenue - cost);
      totalRevenue += revenue;
      totalCost += cost;
      rows.push({
        invoiceNumber: s.invoiceNumber,
        saleDate: s.saleDate.toISOString().slice(0, 10),
        revenue,
        cost: r2(cost),
        profit: profitValue,
        margin: revenue > 0 ? `${r2((profitValue / revenue) * 100)}%` : '—',
      });
    }
    return {
      rows,
      totals: [
        { key: 'revenue', label: 'Total Revenue', value: r2(totalRevenue) },
        { key: 'cost', label: 'Total Cost', value: r2(totalCost) },
        { key: 'profit', label: 'Net Profit', value: r2(totalRevenue - totalCost) },
      ],
    };
  }

  private async productSales(start: Date, end: Date, take: number) {
    const items = await this.prisma.saleItem.findMany({
      where: { sale: { saleDate: { gte: start, lte: end }, status: { in: SALE_STATUSES } } },
      select: { quantity: true, totalPrice: true, product: { select: { id: true, name: true, sku: true, category: { select: { name: true } } } } },
      take: 2000,
    });
    const grouped = new Map<string, { product: string; sku: string; category: string; quantity: number; revenue: number; salesCount: number }>();
    for (const item of items) {
      const key = item.product.id;
      const entry = grouped.get(key) ?? { product: item.product.name, sku: item.product.sku ?? '—', category: item.product.category?.name ?? '—', quantity: 0, revenue: 0, salesCount: 0 };
      entry.quantity += item.quantity;
      entry.revenue += n2(item.totalPrice);
      entry.salesCount += 1;
      grouped.set(key, entry);
    }
    const sorted = Array.from(grouped.values()).map((g) => ({ ...g, revenue: r2(g.revenue) })).sort((a, b) => b.revenue - a.revenue).slice(0, take);
    return {
      rows: sorted,
      totals: [
        { key: 'revenue', label: 'Total Revenue', value: r2(sorted.reduce((x, r) => x + r.revenue, 0)) },
        { key: 'quantity', label: 'Total Units', value: sorted.reduce((x, r) => x + r.quantity, 0) },
      ],
    };
  }

  private async categorySales(start: Date, end: Date, take: number) {
    const items = await this.prisma.saleItem.findMany({
      where: { sale: { saleDate: { gte: start, lte: end }, status: { in: SALE_STATUSES } } },
      select: { quantity: true, totalPrice: true, product: { select: { category: { select: { id: true, name: true } } } } },
      take: 2000,
    });
    const grouped = new Map<string, { category: string; quantity: number; revenue: number; salesCount: number }>();
    for (const item of items) {
      const key = item.product.category?.id ?? 'uncategorized';
      const entry = grouped.get(key) ?? { category: item.product.category?.name ?? 'Uncategorized', quantity: 0, revenue: 0, salesCount: 0 };
      entry.quantity += item.quantity;
      entry.revenue += n2(item.totalPrice);
      entry.salesCount += 1;
      grouped.set(key, entry);
    }
    const sorted = Array.from(grouped.values()).map((g) => ({ ...g, revenue: r2(g.revenue) })).sort((a, b) => b.revenue - a.revenue).slice(0, take);
    return {
      rows: sorted,
      totals: [{ key: 'revenue', label: 'Total Revenue', value: r2(sorted.reduce((x, r) => x + r.revenue, 0)) }],
    };
  }

  private async customers(start: Date, end: Date, take: number) {
    const customers = await this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { sales: { where: { saleDate: { gte: start, lte: end } }, select: { totalAmount: true, paidAmount: true, saleDate: true } } },
    });
    return {
      rows: customers.map((c) => {
        const spent = c.sales.reduce((x, s) => x + n2(s.totalAmount), 0);
        const paid = c.sales.reduce((x, s) => x + n2(s.paidAmount), 0);
        const last = c.sales.reduce<Date | null>((m, s) => (m === null || s.saleDate > m ? new Date(s.saleDate) : m), null);
        return {
          name: c.name,
          phone: c.phone ?? '—',
          salesCount: c.sales.length,
          totalSpent: r2(spent),
          totalPaid: r2(paid),
          balance: r2(n2(c.balance)),
          lastSale: last ? last.toISOString().slice(0, 10) : '—',
        };
      }),
      totals: [{ key: 'balance', label: 'Outstanding Balances', value: r2(customers.reduce((x, c) => x + n2(c.balance), 0)) }],
    };
  }

  private async suppliers(start: Date, end: Date, take: number) {
    const suppliers = await this.prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { purchaseOrders: { where: { orderDate: { gte: start, lte: end } }, select: { totalAmount: true } } },
    });
    return {
      rows: suppliers.map((s) => ({
        name: s.name,
        contactPerson: s.contactPerson ?? '—',
        phone: s.phone ?? '—',
        ordersCount: s.purchaseOrders.length,
        totalPurchases: r2(s.purchaseOrders.reduce((x, o) => x + n2(o.totalAmount), 0)),
        balance: r2(n2(s.currentBalance)),
      })),
      totals: [{ key: 'balance', label: 'Outstanding Balances', value: r2(suppliers.reduce((x, s) => x + n2(s.currentBalance), 0)) }],
    };
  }

  private async inventory() {
    const [products, batchRows] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where: { deletedAt: null }, include: { category: true } }),
      this.prisma.batch.findMany({ select: { productId: true, quantity: true, remainingQuantity: true, purchasePrice: true, sellingPrice: true } }),
    ]);
    const byProduct = new Map<string, { stock: number; purchaseValue: number; sellingValue: number }>();
    for (const b of batchRows) {
      const entry = byProduct.get(b.productId) ?? { stock: 0, purchaseValue: 0, sellingValue: 0 };
      entry.stock += b.remainingQuantity;
      entry.purchaseValue += b.remainingQuantity * n2(b.purchasePrice);
      entry.sellingValue += b.remainingQuantity * n2(b.sellingPrice);
      byProduct.set(b.productId, entry);
    }
    const rows = products
      .map((p) => {
        const agg = byProduct.get(p.id) ?? { stock: 0, purchaseValue: 0, sellingValue: 0 };
        return {
          name: p.name,
          sku: p.sku ?? '—',
          category: p.category?.name ?? '—',
          stock: agg.stock,
          purchaseValue: r2(agg.purchaseValue),
          sellingValue: r2(agg.sellingValue),
          reorderLevel: p.reorderLevel,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      rows,
      totals: [
        { key: 'purchaseValue', label: 'Cost Value', value: r2(rows.reduce((x, r) => x + r.purchaseValue, 0)) },
        { key: 'sellingValue', label: 'Selling Value', value: r2(rows.reduce((x, r) => x + r.sellingValue, 0)) },
      ],
    };
  }

  private async stockMovements(start: Date, end: Date, take: number) {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
      take,
      include: { product: true, batch: { select: { batchNumber: true } }, user: { select: { firstName: true, lastName: true } } },
    });
    return {
      rows: movements.map((m) => ({
        date: m.createdAt.toISOString().slice(0, 10),
        product: m.product.name,
        batch: m.batch?.batchNumber ?? '—',
        type: m.type,
        quantity: m.quantity,
        before: m.beforeQuantity,
        after: m.afterQuantity,
        user: m.user ? userName(m.user) : '—',
      })),
    };
  }

  private async lowStock() {
    const [products, batchRows] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where: { isActive: true, deletedAt: null }, include: { category: true } }),
      this.prisma.batch.findMany({ select: { productId: true, remainingQuantity: true } }),
    ]);
    const stock = new Map<string, number>();
    for (const b of batchRows) stock.set(b.productId, (stock.get(b.productId) ?? 0) + b.remainingQuantity);
    const rows = products
      .filter((p) => (stock.get(p.id) ?? 0) <= p.reorderLevel)
      .map((p) => ({ name: p.name, sku: p.sku ?? '—', category: p.category?.name ?? '—', stock: stock.get(p.id) ?? 0, reorderLevel: p.reorderLevel }))
      .sort((a, b) => a.stock - b.stock);
    return { rows, totals: [{ key: 'stock', label: 'Items Below Reorder', value: rows.length }] };
  }

  private async expiry() {
    const now = new Date();
    const soon = new Date(now.getTime() + 90 * 86_400_000);
    const batches = await this.prisma.batch.findMany({
      where: { remainingQuantity: { gt: 0 }, expiryDate: { gte: now, lte: soon } },
      orderBy: { expiryDate: 'asc' },
      take: 500,
      include: { product: { select: { name: true, sku: true } } },
    });
    return {
      rows: batches.map((b) => ({
        batchNumber: b.batchNumber,
        product: b.product.name,
        expiryDate: b.expiryDate.toISOString().slice(0, 10),
        daysLeft: Math.ceil((b.expiryDate.getTime() - now.getTime()) / 86_400_000),
        quantity: b.remainingQuantity,
      })),
    };
  }

  private async expired() {
    const now = new Date();
    const batches = await this.prisma.batch.findMany({
      where: { remainingQuantity: { gt: 0 }, expiryDate: { lt: now } },
      orderBy: { expiryDate: 'asc' },
      take: 500,
      include: { product: { select: { name: true, sku: true } } },
    });
    return {
      rows: batches.map((b) => ({ batchNumber: b.batchNumber, product: b.product.name, expiryDate: b.expiryDate.toISOString().slice(0, 10), quantity: b.remainingQuantity })),
    };
  }

  private async purchaseReturns(start: Date, end: Date, take: number) {
    const returns = await this.prisma.purchaseReturn.findMany({
      where: { returnDate: { gte: start, lte: end } },
      orderBy: { returnDate: 'desc' },
      take,
      include: { supplier: true },
    });
    return {
      rows: returns.map((r) => ({
        returnNumber: r.returnNumber,
        returnDate: r.returnDate.toISOString().slice(0, 10),
        supplier: r.supplier.name,
        totalAmount: n2(r.totalAmount),
        reason: r.reason ?? '—',
      })),
      totals: [{ key: 'totalAmount', label: 'Total Returns', value: r2(returns.reduce((x, r) => x + n2(r.totalAmount), 0)) }],
    };
  }

  private async salesReturns(start: Date, end: Date, take: number) {
    const returns = await this.prisma.salesReturn.findMany({
      where: { returnDate: { gte: start, lte: end } },
      orderBy: { returnDate: 'desc' },
      take,
      include: { sale: { select: { invoiceNumber: true } }, customer: true },
    });
    return {
      rows: returns.map((r) => ({
        returnNumber: r.returnNumber,
        returnDate: r.returnDate.toISOString().slice(0, 10),
        saleNumber: r.sale.invoiceNumber,
        customer: r.customer?.name ?? '—',
        totalAmount: n2(r.totalAmount),
        refundMethod: r.refundMethod ?? '—',
        reason: r.reason ?? '—',
      })),
      totals: [{ key: 'totalAmount', label: 'Total Returns', value: r2(returns.reduce((x, r) => x + n2(r.totalAmount), 0)) }],
    };
  }

  private async expenses(start: Date, end: Date, take: number) {
    const expenses = await this.prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'desc' },
      take,
      include: { category: true, createdBy: { select: { firstName: true, lastName: true } }, approvedBy: { select: { firstName: true, lastName: true } } },
    });
    return {
      rows: expenses.map((e) => ({
        date: e.date.toISOString().slice(0, 10),
        category: e.category?.name ?? '—',
        description: e.description ?? '—',
        amount: n2(e.amount),
        paymentMethod: e.paymentMethod,
        status: e.status,
        createdBy: userName(e.createdBy),
        approvedBy: e.approvedBy ? userName(e.approvedBy) : '—',
      })),
      totals: [{ key: 'amount', label: 'Total Expenses', value: r2(expenses.reduce((x, e) => x + n2(e.amount), 0)) }],
    };
  }

  private async cashRegister(start: Date, end: Date, take: number) {
    const sessions = await this.prisma.cashSession.findMany({
      where: { openedAt: { gte: start, lte: end } },
      orderBy: { openedAt: 'desc' },
      take,
      include: { cashRegister: true, user: { select: { firstName: true, lastName: true } } },
    });
    return {
      rows: sessions.map((s) => {
        const expected = n2(s.expectedClosingBalance);
        const closing = s.closingBalance ? n2(s.closingBalance) : null;
        return {
          register: s.cashRegister.name,
          user: userName(s.user),
          openedAt: s.openedAt.toISOString().slice(0, 10),
          closedAt: s.closedAt ? s.closedAt.toISOString().slice(0, 10) : '—',
          openingBalance: n2(s.openingBalance),
          expectedClosingBalance: expected,
          closingBalance: closing ?? '—',
          difference: closing !== null ? r2(expected - closing) : '—',
          status: s.status,
        };
      }),
    };
  }

  private async payments(start: Date, end: Date, take: number) {
    const payments = await this.prisma.payment.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'desc' },
      take,
      include: { customer: true, supplier: true, expense: { select: { description: true } }, user: { select: { firstName: true, lastName: true } } },
    });
    const rows = payments.map((p) => {
      let entity = '—';
      if (p.customer) entity = p.customer.name;
      else if (p.supplier) entity = p.supplier.name;
      else if (p.expense) entity = p.expense.description ?? '—';
      return {
        id: p.id.slice(0, 8),
        date: p.date.toISOString().slice(0, 10),
        type: p.type,
        entity,
        amount: n2(p.amount),
        paymentMethod: p.paymentMethod,
        reference: p.reference ?? '—',
        user: userName(p.user),
      };
    });
    return { rows };
  }

  private async tax(start: Date, end: Date, take: number) {
    const sales = await this.prisma.sale.findMany({
      where: { saleDate: { gte: start, lte: end } },
      orderBy: { saleDate: 'desc' },
      take,
      select: { invoiceNumber: true, saleDate: true, subtotal: true, taxAmount: true, totalAmount: true },
    });
    return {
      rows: sales.map((s) => ({
        invoiceNumber: s.invoiceNumber,
        saleDate: s.saleDate.toISOString().slice(0, 10),
        subtotal: n2(s.subtotal),
        taxAmount: n2(s.taxAmount),
        total: n2(s.totalAmount),
      })),
      totals: [{ key: 'taxAmount', label: 'VAT Collected', value: r2(sales.reduce((x, s) => x + n2(s.taxAmount), 0)) }],
    };
  }

  private async userActivity(start: Date, end: Date, take: number) {
    const logs = await this.prisma.auditLog.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    return {
      rows: logs.map((l) => ({
        date: l.createdAt.toISOString().slice(0, 10),
        user: l.user ? userName(l.user) : 'System',
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId ?? '—',
      })),
    };
  }

  private async prescriptions(start: Date, end: Date, take: number) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: { issueDate: { gte: start, lte: end } },
      orderBy: { issueDate: 'desc' },
      take,
      include: { customer: true, dispensedBy: { select: { firstName: true, lastName: true } }, items: { select: { quantity: true, dispensedQuantity: true } } },
    });
    return {
      rows: prescriptions.map((p) => ({
        prescriptionNumber: p.prescriptionNumber,
        issueDate: p.issueDate.toISOString().slice(0, 10),
        customer: p.customer.name,
        doctor: p.doctorName ?? '—',
        itemCount: p.items.length,
        totalQuantity: p.items.reduce((x, i) => x + i.quantity, 0),
        dispensedQuantity: p.items.reduce((x, i) => x + i.dispensedQuantity, 0),
        status: p.status,
        dispensedBy: p.dispensedBy ? userName(p.dispensedBy) : '—',
      })),
    };
  }

  // ── Export ─────────────────────────────────────────────────────

  toCsv(result: ReportResult): string {
    const header = result.columns.map((c) => `"${c.label}"`).join(',');
    const lines = result.rows.map((row) => result.columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','));
    return `\uFEFF${header}\n${lines.join('\n')}`;
  }
}