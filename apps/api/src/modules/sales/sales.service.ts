import { Injectable } from '@nestjs/common';
import type { Prisma, Sale } from '@prisma/client';
import { getPagination, type PaginationQuery } from '@pharmapro/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { rowsToCsv, type CsvColumn } from '../../common/utils/csv';

export type SalesFilter = PaginationQuery & {
  status?: string;
  paymentStatus?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: PaginationQuery & {
      status?: string;
      paymentStatus?: string;
      customerId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
  ) {
    const { skip, take } = getPagination(query);

    const where: Prisma.SaleWhereInput = {
      ...(query.status ? { status: query.status as Sale['status'] } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus as Sale['paymentStatus'] } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            saleDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: { saleDate: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          cashier: { select: { id: true, firstName: true, lastName: true } },
          items: { select: { quantity: true } },
          payments: { select: { paymentMethod: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        saleDate: row.saleDate,
        customerId: row.customerId,
        subtotal: row.subtotal.toNumber(),
        taxAmount: row.taxAmount.toNumber(),
        discountAmount: row.discountAmount.toNumber(),
        totalAmount: row.totalAmount.toNumber(),
        paidAmount: row.paidAmount.toNumber(),
        changeAmount: row.changeAmount.toNumber(),
        paymentStatus: row.paymentStatus,
        status: row.status,
        itemCount: row.items.reduce((sum, i) => sum + i.quantity, 0),
        paymentMethods: row.payments.map((p) => p.paymentMethod),
        customer: row.customer,
        cashier: row.cashier,
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

  async exportCsv(query: SalesFilter): Promise<string> {
    const where: Prisma.SaleWhereInput = {
      ...(query.status ? { status: query.status as Sale['status'] } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus as Sale['paymentStatus'] } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            saleDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.sale.findMany({
      where,
      take: 5000,
      orderBy: { saleDate: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        cashier: { select: { id: true, firstName: true, lastName: true } },
        items: { select: { quantity: true } },
        payments: { select: { paymentMethod: true } },
      },
    });

    const columns: CsvColumn[] = [
      { key: 'id', label: 'ID' },
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'saleDate', label: 'Date' },
      { key: 'customer', label: 'Customer' },
      { key: 'itemCount', label: 'Items' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'taxAmount', label: 'Tax' },
      { key: 'discountAmount', label: 'Discount' },
      { key: 'totalAmount', label: 'Total' },
      { key: 'paidAmount', label: 'Paid' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'status', label: 'Status' },
      { key: 'paymentMethods', label: 'Payment Methods' },
      { key: 'cashier', label: 'Cashier' },
    ];

    const data = rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      saleDate: row.saleDate.toISOString().slice(0, 10),
      customer: row.customer?.name ?? '',
      itemCount: row.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: row.subtotal.toNumber(),
      taxAmount: row.taxAmount.toNumber(),
      discountAmount: row.discountAmount.toNumber(),
      totalAmount: row.totalAmount.toNumber(),
      paidAmount: row.paidAmount.toNumber(),
      paymentStatus: row.paymentStatus,
      status: row.status,
      paymentMethods: row.payments.map((p) => p.paymentMethod).join(' | '),
      cashier: row.cashier ? `${row.cashier.firstName} ${row.cashier.lastName}`.trim() : '',
    }));

    return rowsToCsv(columns, data);
  }
}