import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ALL_TYPES = ['products', 'customers', 'suppliers', 'manufacturers', 'sales'] as const;
export type SearchType = (typeof ALL_TYPES)[number];

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, types?: string) {
    const query = (q ?? '').trim();
    const requested = (types ? String(types).split(',') : []).filter((t) =>
      (ALL_TYPES as readonly string[]).includes(t),
    ) as SearchType[];
    const active = requested.length > 0 ? requested : [...ALL_TYPES];

    const results: Record<string, unknown[]> = {};
    for (const key of ALL_TYPES) {
      results[key] = [];
    }
    let count = 0;

    if (query) {
      for (const type of active) {
        const rows = await this.run(type, query);
        results[type] = rows;
        count += rows.length;
      }
    }

    return { query, count, results };
  }

  private async run(type: SearchType, query: string): Promise<unknown[]> {
    switch (type) {
      case 'products': {
        const q: Prisma.StringFilter = { contains: query, mode: 'insensitive' };
        return this.prisma.product.findMany({
          where: { deletedAt: null, isActive: true, OR: [{ name: q }, { nameAr: q }, { genericName: q }, { brandName: q }, { barcode: q }, { sku: q }] },
          select: { id: true, name: true, nameAr: true, brandName: true, sku: true, barcode: true, sellingPrice: true, category: { select: { name: true } } },
          take: 8,
          orderBy: { name: 'asc' },
        });
      }
      case 'customers': {
        const q: Prisma.StringFilter = { contains: query, mode: 'insensitive' };
        return this.prisma.customer.findMany({
          where: { OR: [{ name: q }, { phone: q }, { email: q }] },
          select: { id: true, name: true, phone: true, email: true, balance: true, isActive: true },
          take: 8,
          orderBy: { name: 'asc' },
        });
      }
      case 'suppliers': {
        const q: Prisma.StringFilter = { contains: query, mode: 'insensitive' };
        return this.prisma.supplier.findMany({
          where: { OR: [{ name: q }, { contactPerson: q }, { phone: q }] },
          select: { id: true, name: true, contactPerson: true, phone: true, currentBalance: true, isActive: true },
          take: 8,
          orderBy: { name: 'asc' },
        });
      }
      case 'manufacturers': {
        const q: Prisma.StringFilter = { contains: query, mode: 'insensitive' };
        return this.prisma.manufacturer.findMany({
          where: { OR: [{ name: q }, { country: q }] },
          select: { id: true, name: true, country: true },
          take: 8,
          orderBy: { name: 'asc' },
        });
      }
      case 'sales': {
        return this.prisma.sale.findMany({
          where: {
            OR: [
              { invoiceNumber: { contains: query, mode: 'insensitive' } },
              { customer: { name: { contains: query, mode: 'insensitive' } } },
            ],
          },
          select: { id: true, invoiceNumber: true, saleDate: true, totalAmount: true, paymentStatus: true, status: true, customer: { select: { name: true } } },
          take: 8,
          orderBy: { saleDate: 'desc' },
        });
      }
    }
  }
}