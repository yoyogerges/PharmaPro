import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, SaleStatus, type Prisma } from '@prisma/client';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { NumberingService } from '../../common/services/numbering.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { CreateSaleDto, CreateSaleItemDto } from './dto/create-sale.dto';

export const saleInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  cashier: { select: { id: true, firstName: true, lastName: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
      batch: { select: { id: true, batchNumber: true } },
    },
  },
  payments: true,
  returns: {
    orderBy: { createdAt: 'desc' as const },
    select: { id: true, returnNumber: true, totalAmount: true, status: true },
  },
} satisfies Prisma.SaleInclude;

const r2 = (n: number) => Math.round(n * 100) / 100;

type Tx = Prisma.TransactionClient;

interface PreparedItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
  allocations: Array<{ batchId: string; take: number; before: number; after: number }>;
}

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly numbering: NumberingService,
    private readonly cashRegisterService: CashRegisterService,
  ) {}

  async createSale(dto: CreateSaleDto, request?: Request) {
    const vatRate = await this.resolveVatRate();
    const userId = this.currentUserId(request);

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...new Set(dto.items.map((i) => i.productId))] }, deletedAt: null, isActive: true },
      select: { id: true, sellingPrice: true },
    });
    if (products.length !== new Set(dto.items.map((i) => i.productId)).size) {
      throw new BadRequestException('One or more products are invalid or inactive');
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer || !customer.isActive) throw new NotFoundException('Customer not found');
    }

    const saleDate = dto.saleDate ? new Date(dto.saleDate) : new Date();
    const sale = await this.prisma.$transaction(async (tx) => {
      const prepared = await this.prepareItems(tx, dto.items, productMap, vatRate);
      const totals = this.computeTotals(prepared, dto.discountAmount ?? 0);
      const paidAmount = r2((dto.payments ?? []).reduce((sum, p) => sum + p.amount, 0));
      const changeAmount = Math.max(0, r2(paidAmount - totals.totalAmount));
      const paymentStatus: PaymentStatus = paidAmount >= totals.totalAmount - 0.005 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

      const invoiceNumber = await this.numbering.generate('sale', saleDate);
      const created = await tx.sale.create({
        data: {
          invoiceNumber,
          saleDate,
          customerId: dto.customerId ?? null,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          paidAmount,
          changeAmount,
          paymentStatus,
          status: SaleStatus.COMPLETED,
          cashierId: userId ?? '',
          notes: dto.notes,
          items: {
            create: prepared.map((p) => ({
              productId: p.productId,
              batchId: p.allocations[0].batchId,
              quantity: p.quantity,
              unitPrice: p.unitPrice,
              discount: p.discount,
              taxRate: p.taxRate,
              totalPrice: p.lineTotal,
            })),
          },
          payments: dto.payments?.length
            ? {
                create: dto.payments.map((payment) => ({
                  paymentMethod: payment.method,
                  amount: payment.amount,
                  reference: payment.reference,
                })),
              }
            : undefined,
        },
        include: saleInclude,
      });

      for (const p of prepared) {
        for (const allocation of p.allocations) {
          await tx.batch.update({
            where: { id: allocation.batchId },
            data: { remainingQuantity: allocation.after },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: p.productId,
              batchId: allocation.batchId,
              type: 'SALE',
              quantity: allocation.take,
              beforeQuantity: allocation.before,
              afterQuantity: allocation.after,
              referenceType: 'Sale',
              referenceId: created.id,
              userId: userId ?? null,
              notes: invoiceNumber,
            },
          });
        }
      }

      return created;
    });

    void this.auditService.log({
      action: 'sales.create',
      entityType: 'Sale',
      entityId: sale.id,
      newValue: {
        invoiceNumber: sale.invoiceNumber,
        customerId: dto.customerId ?? null,
        itemCount: dto.items.length,
        totalAmount: sale.totalAmount.toNumber(),
        paymentStatus: sale.paymentStatus,
      },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    if (userId) {
      const cashPaid = (dto.payments ?? []).filter((p) => p.method === 'CASH').reduce((sum, p) => sum + p.amount, 0);
      if (cashPaid > 0) {
        await this.cashRegisterService.addMovement(userId, 'SALE', cashPaid, 'Sale', sale.id, `Sale ${sale.invoiceNumber}`);
      }
    }

    return this.toDetail(sale);
  }

  async findOne(id: string) {
    const row = await this.prisma.sale.findUnique({ where: { id }, include: saleInclude });
    if (!row) throw new NotFoundException('Sale not found');
    return this.toDetail(row);
  }

  async productSearch(q?: string) {
    const term = q?.trim() ?? '';
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { genericName: { contains: term, mode: 'insensitive' } },
                { brandName: { contains: term, mode: 'insensitive' } },
                { sku: { contains: term, mode: 'insensitive' } },
                { barcode: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: 25,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, nameAr: true, sku: true, barcode: true, unit: true, sellingPrice: true, taxRate: true, prescriptionRequired: true },
    });
    return this.withStock(products);
  }

  async barcodeLookup(code: string) {
    const term = typeof code === 'string' ? code.trim() : '';
    if (!term) throw new BadRequestException('Barcode is required');
    const product = await this.prisma.product.findFirst({
      where: { deletedAt: null, isActive: true, OR: [{ barcode: term }, { sku: term }] },
      select: { id: true, name: true, nameAr: true, sku: true, barcode: true, unit: true, sellingPrice: true, taxRate: true, prescriptionRequired: true },
    });
    if (!product) throw new NotFoundException('No product found for this barcode');
    const [decorated] = await this.withStock([product]);
    return decorated;
  }

  async receipt(id: string) {
    const row = await this.prisma.sale.findUnique({ where: { id }, include: saleInclude });
    if (!row) throw new NotFoundException('Sale not found');
    return {
      ...this.toDetail(row),
      items: row.items.map((item) => ({
        name: item.product.name,
        sku: item.product.sku,
        batchNumber: item.batch?.batchNumber ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
      })),
    };
  }

  // ── Helpers ─────────────────────────────────────────────────

  private async withStock(
    products: Array<{ id: string; name: string; nameAr: string | null; sku: string | null; barcode: string | null; unit: string; sellingPrice: Prisma.Decimal; taxRate: Prisma.Decimal | number; prescriptionRequired: boolean }>,
  ): Promise<Array<{ id: string; name: string; nameAr: string | null; sku: string | null; barcode: string | null; unit: string; sellingPrice: number; taxRate: number; stockQuantity: number; prescriptionRequired: boolean }>> {
    if (products.length === 0) return [];
    const aggregated = await this.prisma.batch.groupBy({
      by: ['productId'],
      where: { productId: { in: products.map((p) => p.id) }, remainingQuantity: { gt: 0 }, expiryDate: { gte: new Date() } },
      _sum: { remainingQuantity: true },
    });
    const stock = new Map(aggregated.map((row) => [row.productId, Number(row._sum.remainingQuantity ?? 0)]));
    return products.map((p) => ({
      ...p,
      sellingPrice: p.sellingPrice.toNumber(),
      taxRate: Number(p.taxRate),
      stockQuantity: stock.get(p.id) ?? 0,
    }));
  }

  private async prepareItems(
    tx: Tx,
    items: CreateSaleItemDto[],
    productMap: Map<string, { id: string; sellingPrice: Prisma.Decimal }>,
    vatRate: number,
  ): Promise<PreparedItem[]> {
    const result: PreparedItem[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      const allocations = await this.allocateBatches(tx, item.productId, item.quantity, item.batchId);
      const unitPrice = this.resolveUnitPrice(item, product, allocations);
      const discount = item.discount ?? 0;
      const taxRate = item.taxRate ?? vatRate;
      const line = item.quantity * unitPrice;
      const lineDiscount = (line * discount) / 100;
      const lineTax = ((line - lineDiscount) * taxRate) / 100;

      result.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: r2(unitPrice),
        discount,
        taxRate,
        lineTotal: r2(line - lineDiscount + lineTax),
        allocations,
      });
    }

    return result;
  }

  private resolveUnitPrice(
    item: CreateSaleItemDto,
    product: { sellingPrice: Prisma.Decimal },
    _allocations: PreparedItem['allocations'],
  ): number {
    if (item.unitPrice !== undefined && Number(item.unitPrice) > 0) return Number(item.unitPrice);
    return Number(product.sellingPrice);
  }

  private async allocateBatches(tx: Tx, productId: string, quantity: number, batchId?: string) {
    if (batchId) {
      const batch = await tx.batch.findUnique({ where: { id: batchId } });
      if (!batch || batch.productId !== productId) {
        throw new BadRequestException('Batch does not belong to this product');
      }
      if (batch.remainingQuantity < quantity) {
        throw new ConflictException(`Insufficient stock in batch (${quantity} requested, ${batch.remainingQuantity} available)`);
      }
      return [{ batchId: batch.id, take: quantity, before: batch.remainingQuantity, after: batch.remainingQuantity - quantity }];
    }

    const batches = await tx.batch.findMany({
      where: { productId, remainingQuantity: { gt: 0 }, expiryDate: { gte: new Date() } },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, remainingQuantity: true },
    });

    let remaining = quantity;
    const allocations: Array<{ batchId: string; take: number; before: number; after: number }> = [];
    for (const batch of batches) {
      const take = Math.min(batch.remainingQuantity, remaining);
      allocations.push({ batchId: batch.id, take, before: batch.remainingQuantity, after: batch.remainingQuantity - take });
      remaining -= take;
      if (remaining <= 0) break;
    }
    if (remaining > 0) {
      throw new ConflictException(`Insufficient stock for product (${quantity} requested, only ${quantity - remaining} available)`);
    }
    return allocations;
  }

  private computeTotals(prepared: PreparedItem[], headerDiscount = 0) {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    for (const p of prepared) {
      const line = p.quantity * p.unitPrice;
      const lineDiscount = (line * p.discount) / 100;
      const lineTax = ((line - lineDiscount) * p.taxRate) / 100;
      subtotal += line;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
    }
    discountTotal += headerDiscount;
    return {
      subtotal: r2(subtotal),
      discountAmount: r2(discountTotal),
      taxAmount: r2(taxTotal),
      totalAmount: r2(subtotal - discountTotal + taxTotal),
    };
  }

  private toDetail(row: Prisma.SaleGetPayload<{ include: typeof saleInclude }>) {
    return {
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
      notes: row.notes,
      createdAt: row.createdAt,
      customer: row.customer,
      cashier: row.cashier,
      items: row.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        batchId: item.batchId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        discount: item.discount.toNumber(),
        taxRate: item.taxRate.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        product: item.product,
        batch: item.batch,
      })),
      payments: row.payments.map((p) => ({
        id: p.id,
        method: p.paymentMethod,
        amount: p.amount.toNumber(),
        reference: p.reference,
      })),
      returns: row.returns,
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