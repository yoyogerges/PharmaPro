import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { SalesReturnsService } from './sales-returns.service';

@ApiTags('Sales Returns')
@ApiBearerAuth()
@Controller('sales-returns')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Get()
  @Permissions('sales.view')
  @ApiOperation({ summary: 'List sales returns' })
  findAll(@Query() query: PaginationQuery & { status?: string; customerId?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    return this.salesReturnsService.findAll(query);
  }

  @Post()
  @Permissions('sales.return')
  @ApiOperation({ summary: 'Create a sales return (restocks stock)' })
  create(@Body() dto: CreateSalesReturnDto, @Req() request: Request) {
    return this.salesReturnsService.create(dto, request);
  }

  @Get(':id')
  @Permissions('sales.view')
  @ApiOperation({ summary: 'Get a sales return with items' })
  findOne(@Param('id') id: string) {
    return this.salesReturnsService.findOne(id);
  }
}