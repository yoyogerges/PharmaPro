import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { getPagination, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cashRegisterService: CashRegisterService,
  ) {}

  async findAll(
    query: PaginationQuery & {
      type?: string;
      paymentMethod?: string;
      customerId?: string;
      supplierId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
  ) {
    const { skip, take } = getPagination(query);
    const where: Prisma.PaymentWhereInput = {
      ...(query.type ? { type: query.type as Prisma.PaymentWhereInput['type'] } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod as Prisma.PaymentWhereInput['paymentMethod'] } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { reference: { contains: query.search, mode: 'insensitive' } },
              { notes: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
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

  async create(dto: CreatePaymentDto, request?: Request) {
    const userId = this.currentUserId(request);
    this.ensureValidEntity(dto);

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer) throw new NotFoundException('Customer not found');
    }
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
      if (!supplier) throw new NotFoundException('Supplier not found');
    }
    if (dto.expenseId) {
      const expense = await this.prisma.expense.findUnique({ where: { id: dto.expenseId } });
      if (!expense) throw new NotFoundException('Expense not found');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      if (dto.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
        if (customer) {
          await tx.customer.update({ where: { id: dto.customerId }, data: { balance: customer.balance.sub(dto.amount).toNumber() } });
        }
      }
      if (dto.supplierId) {
        const supplier = await tx.supplier.findUnique({ where: { id: dto.supplierId } });
        if (supplier) {
          await tx.supplier.update({ where: { id: dto.supplierId }, data: { currentBalance: supplier.currentBalance.sub(dto.amount).toNumber() } });
        }
      }
      return tx.payment.create({
        data: {
          type: dto.type,
          amount: dto.amount,
          date: dto.date ? new Date(dto.date) : new Date(),
          paymentMethod: dto.paymentMethod,
          reference: dto.reference,
          customerId: dto.customerId ?? null,
          supplierId: dto.supplierId ?? null,
          expenseId: dto.expenseId ?? null,
          userId: userId ?? '',
          notes: dto.notes,
        },
        include: {
          customer: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          expense: { select: { id: true, description: true, amount: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });

    if (userId && dto.paymentMethod === 'CASH') {
      const flow = dto.type === 'CUSTOMER_PAYMENT' ? 'DEPOSIT' : dto.type === 'SALE_REFUND' ? 'SALE_REFUND' : 'WITHDRAWAL';
      await this.cashRegisterService.addMovement(userId, flow as any, dto.amount, 'Payment', payment.id, dto.notes ?? dto.reference ?? `Payment (${dto.type})`);
    }

    void this.auditService.log({
      action: 'payments.create',
      entityType: 'Payment',
      entityId: payment.id,
      newValue: { type: dto.type, amount: dto.amount, paymentMethod: dto.paymentMethod },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toListItem(payment);
  }

  async findOne(id: string) {
    const row = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        supplier: { select: { id: true, name: true } },
        expense: { select: { id: true, description: true, amount: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!row) throw new NotFoundException('Payment not found');
    return this.toListItem(row);
  }

  private ensureValidEntity(dto: CreatePaymentDto) {
    if (dto.type === 'CUSTOMER_PAYMENT' && !dto.customerId) {
      throw new BadRequestException('customerId is required for CUSTOMER_PAYMENT');
    }
    if (dto.type === 'SUPPLIER_PAYMENT' && !dto.supplierId) {
      throw new BadRequestException('supplierId is required for SUPPLIER_PAYMENT');
    }
    if (dto.type === 'EXPENSE_PAYMENT' && !dto.expenseId) {
      throw new BadRequestException('expenseId is required for EXPENSE_PAYMENT');
    }
    if (dto.customerId && dto.supplierId) {
      throw new BadRequestException('A payment cannot reference both a customer and a supplier');
    }
  }

  private toListItem(row: any) {
    return {
      id: row.id,
      type: row.type,
      amount: row.amount.toNumber(),
      date: row.date,
      paymentMethod: row.paymentMethod,
      reference: row.reference,
      customerId: row.customerId,
      supplierId: row.supplierId,
      expenseId: row.expenseId,
      notes: row.notes,
      createdAt: row.createdAt,
      customer: row.customer,
      supplier: row.supplier,
      expense: row.expense,
      user: row.user,
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}