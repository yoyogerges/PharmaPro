import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrescriptionStatus, type Prisma } from '@prisma/client';
import { getPagination, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { NumberingService } from '../../common/services/numbering.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrescriptionDto, DispenseDto, UpdatePrescriptionDto } from './dto/prescription.dto';

const prescriptionDetailInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  dispensedBy: { select: { id: true, firstName: true, lastName: true } },
  items: {
    orderBy: { product: { name: 'asc' as const } },
    include: {
      product: { select: { id: true, name: true, sku: true, sellingPrice: true, prescriptionRequired: true } },
    },
  },
  sales: { select: { id: true, invoiceNumber: true, saleDate: true } },
} satisfies Prisma.PrescriptionInclude;

type Tx = Prisma.TransactionClient;

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly numbering: NumberingService,
  ) {}

  async findAll(
    query: PaginationQuery & {
      status?: string;
      customerId?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const { skip, take } = getPagination(query);

    const where: Prisma.PrescriptionWhereInput = {
      ...(query.status ? { status: query.status as PrescriptionStatus } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            issueDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { prescriptionNumber: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              { doctorName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.prescription.count({ where }),
      this.prisma.prescription.findMany({
        where,
        skip,
        take,
        orderBy: { issueDate: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          dispensedBy: { select: { id: true, firstName: true, lastName: true } },
          items: { select: { quantity: true, dispensedQuantity: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => {
        const prescribed = row.items.reduce((sum, i) => sum + i.quantity, 0);
        const dispensed = row.items.reduce((sum, i) => sum + i.dispensedQuantity, 0);
        return {
          id: row.id,
          prescriptionNumber: row.prescriptionNumber,
          customerId: row.customerId,
          doctorName: row.doctorName,
          issueDate: row.issueDate,
          status: row.status,
          notes: row.notes,
          itemCount: row.items.length,
          totalQuantity: prescribed,
          dispensedQuantity: dispensed,
          remainingQuantity: prescribed - dispensed,
          customer: row.customer,
          dispensedBy: row.dispensedBy,
          dispensedAt: row.dispensedAt,
          createdAt: row.createdAt,
        };
      }),
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

  async findOne(id: string) {
    const row = await this.prisma.prescription.findUnique({ where: { id }, include: prescriptionDetailInclude });
    if (!row) throw new NotFoundException('Prescription not found');
    return this.toDetail(row);
  }

  async create(dto: CreatePrescriptionDto, request?: Request) {
    const userId = this.currentUserId(request);

    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer || !customer.isActive) throw new BadRequestException('Customer not found or inactive');

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are invalid or inactive');
    }

    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();
    const prescription = await this.prisma.$transaction(async (tx) => {
      const prescriptionNumber = await this.numbering.generate('prescription', issueDate);
      return tx.prescription.create({
        data: {
          prescriptionNumber,
          customerId: dto.customerId,
          doctorName: dto.doctorName,
          doctorPhone: dto.doctorPhone,
          issueDate,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              dosageInstructions: item.dosageInstructions,
              notes: item.notes,
            })),
          },
        },
        include: prescriptionDetailInclude,
      });
    });

    void this.auditService.log({
      action: 'prescriptions.create',
      entityType: 'Prescription',
      entityId: prescription.id,
      newValue: {
        prescriptionNumber: prescription.prescriptionNumber,
        customerId: dto.customerId,
        itemCount: dto.items.length,
      },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(prescription);
  }

  async update(id: string, dto: UpdatePrescriptionDto, request?: Request) {
    const existing = await this.prisma.prescription.findUnique({ where: { id }, include: { items: true } });
    if (!existing) throw new NotFoundException('Prescription not found');
    if (existing.status !== PrescriptionStatus.PENDING) {
      throw new BadRequestException('Only pending prescriptions can be edited');
    }

    const userId = this.currentUserId(request);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        const productIds = [...new Set(dto.items!.map((i) => i.productId))];
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, deletedAt: null, isActive: true },
          select: { id: true },
        });
        if (products.length !== productIds.length) {
          throw new BadRequestException('One or more products are invalid or inactive');
        }
        await tx.prescriptionItem.deleteMany({ where: { prescriptionId: id } });
      }

      return tx.prescription.update({
        where: { id },
        data: {
          doctorName: dto.doctorName,
          doctorPhone: dto.doctorPhone,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          notes: dto.notes,
          items: dto.items
            ? {
                create: dto.items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  dosageInstructions: item.dosageInstructions,
                  notes: item.notes,
                })),
              }
            : undefined,
        },
        include: prescriptionDetailInclude,
      });
    });

    void this.auditService.log({
      action: 'prescriptions.update',
      entityType: 'Prescription',
      entityId: id,
      previousValue: { prescriptionNumber: existing.prescriptionNumber },
      newValue: { itemCount: dto.items?.length ?? existing.items.length },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(updated);
  }

  async dispense(id: string, dto: DispenseDto, request?: Request) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: { items: { select: { id: true, productId: true, quantity: true, dispensedQuantity: true } } },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    if (prescription.status === PrescriptionStatus.CANCELLED) {
      throw new BadRequestException('Cannot dispense a cancelled prescription');
    }
    if (prescription.status === PrescriptionStatus.DISPENSED) {
      throw new ConflictException('Prescription is already fully dispensed');
    }

    const itemMap = new Map(prescription.items.map((i) => [i.id, i]));
    for (const item of dto.items) {
      const prescriptionItem = itemMap.get(item.prescriptionItemId);
      if (!prescriptionItem) throw new BadRequestException('One or more items do not belong to this prescription');
      const remaining = prescriptionItem.quantity - prescriptionItem.dispensedQuantity;
      if (item.quantity > remaining) {
        throw new ConflictException(`Dispensing quantity exceeds the remaining amount (max ${remaining})`);
      }
    }

    const userId = this.currentUserId(request);
    const allDispensed = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const prescriptionItem = itemMap.get(item.prescriptionItemId)!;
        const allocations = await this.allocateBatches(tx, prescriptionItem.productId, item.quantity);
        for (const allocation of allocations) {
          await tx.batch.update({
            where: { id: allocation.batchId },
            data: { remainingQuantity: allocation.after },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: prescriptionItem.productId,
              batchId: allocation.batchId,
              type: 'SALE',
              quantity: allocation.take,
              beforeQuantity: allocation.before,
              afterQuantity: allocation.after,
              referenceType: 'Prescription',
              referenceId: prescription.id,
              userId: userId ?? null,
              notes: prescription.prescriptionNumber,
            },
          });
        }
        await tx.prescriptionItem.update({
          where: { id: prescriptionItem.id },
          data: { dispensedQuantity: { increment: item.quantity } },
        });
      }

      const refreshed = await tx.prescription.findUniqueOrThrow({
        where: { id },
        include: { items: { select: { quantity: true, dispensedQuantity: true } } },
      });
      const fullyDispensed =
        refreshed.items.length > 0 && refreshed.items.every((i) => i.dispensedQuantity >= i.quantity);

      const updated = await tx.prescription.update({
        where: { id },
        data: {
          status: fullyDispensed ? PrescriptionStatus.DISPENSED : PrescriptionStatus.PARTIALLY_DISPENSED,
          ...(fullyDispensed ? { dispensedById: userId ?? null, dispensedAt: new Date() } : {}),
        },
        include: prescriptionDetailInclude,
      });
      return fullyDispensed;
    });

    void this.auditService.log({
      action: 'prescriptions.dispense',
      entityType: 'Prescription',
      entityId: id,
      newValue: {
        prescriptionNumber: prescription.prescriptionNumber,
        dispensedItems: dto.items.length,
        fullyDispensed: allDispensed,
      },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.findOne(id);
  }

  async cancel(id: string, request?: Request) {
    const existing = await this.prisma.prescription.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prescription not found');
    if (existing.status === PrescriptionStatus.DISPENSED) {
      throw new BadRequestException('Cannot cancel a fully dispensed prescription');
    }
    if (existing.status === PrescriptionStatus.CANCELLED) {
      throw new ConflictException('Prescription is already cancelled');
    }

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: { status: PrescriptionStatus.CANCELLED },
      include: prescriptionDetailInclude,
    });

    void this.auditService.log({
      action: 'prescriptions.cancel',
      entityType: 'Prescription',
      entityId: id,
      previousValue: { prescriptionNumber: existing.prescriptionNumber, status: existing.status },
      newValue: { status: PrescriptionStatus.CANCELLED },
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(updated);
  }

  async customerHistory(customerId: string) {
    const rows = await this.prisma.prescription.findMany({
      where: { customerId, status: { not: PrescriptionStatus.CANCELLED } },
      orderBy: { issueDate: 'desc' },
      take: 50,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        dispensedBy: { select: { id: true, firstName: true, lastName: true } },
        items: { select: { quantity: true, dispensedQuantity: true } },
      },
    });
    return rows.map((row) => {
      const prescribed = row.items.reduce((sum, i) => sum + i.quantity, 0);
      const dispensed = row.items.reduce((sum, i) => sum + i.dispensedQuantity, 0);
      return {
        id: row.id,
        prescriptionNumber: row.prescriptionNumber,
        issueDate: row.issueDate,
        status: row.status,
        doctorName: row.doctorName,
        itemCount: row.items.length,
        totalQuantity: prescribed,
        dispensedQuantity: dispensed,
        remainingQuantity: prescribed - dispensed,
        customer: row.customer,
        dispensedBy: row.dispensedBy,
        dispensedAt: row.dispensedAt,
      };
    });
  }

  // ── Helpers ─────────────────────────────────────────────────

  private async allocateBatches(
    tx: Tx,
    productId: string,
    quantity: number,
  ): Promise<Array<{ batchId: string; take: number; before: number; after: number }>> {
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

  private toDetail(row: Prisma.PrescriptionGetPayload<{ include: typeof prescriptionDetailInclude }>) {
    const prescribed = row.items.reduce((sum, i) => sum + i.quantity, 0);
    const dispensed = row.items.reduce((sum, i) => sum + i.dispensedQuantity, 0);
    return {
      id: row.id,
      prescriptionNumber: row.prescriptionNumber,
      customerId: row.customerId,
      doctorName: row.doctorName,
      doctorPhone: row.doctorPhone,
      issueDate: row.issueDate,
      status: row.status,
      notes: row.notes,
      customer: row.customer,
      dispensedBy: row.dispensedBy,
      dispensedAt: row.dispensedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      itemCount: row.items.length,
      totalQuantity: prescribed,
      dispensedQuantity: dispensed,
      remainingQuantity: prescribed - dispensed,
      items: row.items.map((item) => ({
        id: item.id,
        prescriptionId: item.prescriptionId,
        productId: item.productId,
        quantity: item.quantity,
        dispensedQuantity: item.dispensedQuantity,
        remainingQuantity: item.quantity - item.dispensedQuantity,
        dosageInstructions: item.dosageInstructions,
        notes: item.notes,
        product: item.product,
      })),
      sales: row.sales,
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}