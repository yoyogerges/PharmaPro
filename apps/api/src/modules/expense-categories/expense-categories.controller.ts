import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ExpenseCategoriesService } from './expense-categories.service';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/expense-category.dto';

@ApiTags('Expense Categories')
@ApiBearerAuth()
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly service: ExpenseCategoriesService) {}

  @Get()
  @Permissions('expenses.view')
  @ApiOperation({ summary: 'List expense categories' })
  findAll(@Query() query: { isActive?: string; search?: string }) {
    return this.service.findAll(query);
  }

  @Post()
  @Permissions('expenses.create')
  @ApiOperation({ summary: 'Create an expense category' })
  create(@Body() dto: CreateExpenseCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('expenses.update')
  @ApiOperation({ summary: 'Update an expense category' })
  update(@Param('id') id: string, @Body() dto: UpdateExpenseCategoryDto) {
    return this.service.update(id, dto);
  }
}