import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @Permissions('expenses.view')
  @ApiOperation({ summary: 'List expenses with status, category and date filters' })
  findAll(
    @Query()
    query: PaginationQuery & {
      status?: string;
      categoryId?: string;
      paymentMethod?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
  ) {
    return this.expensesService.findAll(query);
  }

  @Post()
  @Permissions('expenses.create')
  @ApiOperation({ summary: 'Create an expense' })
  create(@Body() dto: CreateExpenseDto, @Req() request: Request) {
    return this.expensesService.create(dto, request);
  }

  @Get(':id')
  @Permissions('expenses.view')
  @ApiOperation({ summary: 'Get an expense' })
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('expenses.update')
  @ApiOperation({ summary: 'Update a pending expense' })
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto, @Req() request: Request) {
    return this.expensesService.update(id, dto, request);
  }

  @Post(':id/approve')
  @Permissions('expenses.approve')
  @ApiOperation({ summary: 'Approve an expense' })
  approve(@Param('id') id: string, @Req() request: Request) {
    return this.expensesService.approve(id, request);
  }

  @Post(':id/reject')
  @Permissions('expenses.approve')
  @ApiOperation({ summary: 'Reject an expense' })
  reject(@Param('id') id: string, @Req() request: Request) {
    return this.expensesService.reject(id, request);
  }
}