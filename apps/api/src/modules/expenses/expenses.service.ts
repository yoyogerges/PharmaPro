import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ExpenseStatus, Prisma } from '@prisma/client';
import { getPagination, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cashRegisterService: CashRegisterService,
  ) {}

  async findAll(
    query: PaginationQuery & {
      status?: string;
      categoryId?: string;
      paymentMethod?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
  ) {
    const { skip, take } = getPagination(query);
    const where: Prisma.ExpenseWhereInput = {
      ...(query.status ? { status: query.status as ExpenseStatus } : {}),
      ...(query.categoryId ? { expenseCategoryId: query.categoryId } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod as Prisma.ExpenseWhereInput['paymentMethod'] } : {}),
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
              { description: { contains: query.search, mode: 'insensitive' } },
              { category: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          category: { select: { id: true, name: true, nameAr: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        expenseCategoryId: row.expenseCategoryId,
        amount: row.amount.toNumber(),
        date: row.date,
        paymentMethod: row.paymentMethod,
        description: row.description,
        status: row.status,
        createdAt: row.createdAt,
        category: row.category,
        createdBy: row.createdBy,
        approvedBy: row.approvedBy,
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

  async findOne(id: string) {
    const row = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!row) throw new NotFoundException('Expense not found');
    return {
      id: row.id,
      expenseCategoryId: row.expenseCategoryId,
      amount: row.amount.toNumber(),
      date: row.date,
      paymentMethod: row.paymentMethod,
      description: row.description,
      attachmentUrl: row.attachmentUrl,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      category: row.category,
      createdBy: row.createdBy,
      approvedBy: row.approvedBy,
    };
  }

  async create(dto: CreateExpenseDto, request?: Request) {
    const userId = this.currentUserId(request);
    const requireApproval = await this.expensesRequireApproval();
    const autoApproved = !requireApproval;

    await this.validateCategory(dto.expenseCategoryId);

    const created = await this.prisma.expense.create({
      data: {
        expenseCategoryId: dto.expenseCategoryId ?? null,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
        paymentMethod: dto.paymentMethod,
        description: dto.description,
        attachmentUrl: dto.attachmentUrl,
        userId: userId ?? '',
        status: autoApproved ? 'APPROVED' : 'PENDING',
        approvedById: autoApproved ? (userId ?? null) : null,
      },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (autoApproved && userId) {
      await this.cashRegisterService.addMovement(userId, 'EXPENSE', dto.amount, 'Expense', created.id, dto.description ?? 'Expense');
    }

    void this.auditService.log({
      action: 'expenses.create',
      entityType: 'Expense',
      entityId: created.id,
      newValue: { amount: dto.amount, paymentMethod: dto.paymentMethod, status: created.status },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(created);
  }

  async update(id: string, dto: UpdateExpenseDto, request?: Request) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense not found');
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Only pending expenses can be edited');
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.expenseCategoryId !== undefined ? { expenseCategoryId: dto.expenseCategoryId } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.attachmentUrl !== undefined ? { attachmentUrl: dto.attachmentUrl } : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    void this.auditService.log({
      action: 'expenses.update',
      entityType: 'Expense',
      entityId: id,
      newValue: dto,
      userId: this.currentUserId(request),
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(updated);
  }

  async approve(id: string, request?: Request) {
    const userId = this.currentUserId(request);
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense not found');
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Only pending expenses can be approved');
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId ?? null },
      include: {
        category: { select: { id: true, name: true, nameAr: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (userId) {
      await this.cashRegisterService.addMovement(userId, 'EXPENSE', existing.amount.toNumber(), 'Expense', id, existing.description ?? 'Expense approved');
    }

    void this.auditService.log({
      action: 'expenses.approve',
      entityType: 'Expense',
      entityId: id,
      newValue: { amount: existing.amount.toNumber(), status: 'APPROVED' },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(updated);
  }

  async reject(id: string, request?: Request) {
    const userId = this.currentUserId(request);
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense not found');
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Only pending expenses can be rejected');
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: 'REJECTED', approvedById: userId ?? null },
      include: {
        category: { select: { id: true, name: true, nameAr: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    void this.auditService.log({
      action: 'expenses.reject',
      entityType: 'Expense',
      entityId: id,
      newValue: { amount: existing.amount.toNumber(), status: 'REJECTED' },
      userId,
      ipAddress: request?.ip ?? undefined,
      userAgent: request?.headers?.['user-agent'] ?? undefined,
    });

    return this.toDetail(updated);
  }

  private async expensesRequireApproval(): Promise<boolean> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'expenses_require_approval' } });
    return (setting?.value ?? 'true') !== 'false';
  }

  private async validateCategory(categoryId?: string) {
    if (!categoryId) return;
    const category = await this.prisma.expenseCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Expense category not found');
  }

  private toDetail(row: any) {
    return {
      id: row.id,
      expenseCategoryId: row.expenseCategoryId,
      amount: row.amount.toNumber(),
      date: row.date,
      paymentMethod: row.paymentMethod,
      description: row.description,
      attachmentUrl: row.attachmentUrl,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      category: row.category,
      createdBy: row.createdBy,
      approvedBy: row.approvedBy,
    };
  }

  private currentUserId(request?: Request): string | undefined {
    const user = request?.user as { sub?: string } | undefined;
    return user?.sub;
  }
}