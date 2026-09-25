import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { isActive?: string; search?: string }) {
    const where: Prisma.ExpenseCategoryWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { nameAr: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.expenseCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      nameAr: row.nameAr,
      description: row.description,
      isActive: row.isActive,
      expenseCount: row._count.expenses,
      createdAt: row.createdAt,
    }));
  }

  async create(dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({ data: dto });
  }

  async update(id: string, dto: UpdateExpenseCategoryDto) {
    const existing = await this.prisma.expenseCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense category not found');
    return this.prisma.expenseCategory.update({ where: { id }, data: dto });
  }
}