import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { SuppliersService, type StatementQuery } from './suppliers.service';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Permissions('suppliers.view')
  @ApiOperation({ summary: 'List suppliers' })
  findAll(@Query() query: PaginationQuery) {
    return this.suppliersService.findAll(query);
  }

  @Get('options')
  @Permissions('suppliers.view')
  @ApiOperation({ summary: 'Lightweight supplier list for dropdowns' })
  findAllNames() {
    return this.suppliersService.findAllNames();
  }

  @Get(':id')
  @Permissions('suppliers.view')
  @ApiOperation({ summary: 'Get a supplier' })
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Get(':id/statement')
  @Permissions('suppliers.view')
  @ApiOperation({ summary: 'Supplier financial statement (receipts, payments, returns)' })
  statement(@Param('id') id: string, @Query() query: StatementQuery) {
    return this.suppliersService.statement(id, query);
  }

  @Get(':id/purchases')
  @Permissions('suppliers.view')
  @ApiOperation({ summary: 'Supplier purchase history (receipts)' })
  purchases(@Param('id') id: string, @Query() query: PaginationQuery) {
    return this.suppliersService.purchases(id, query);
  }

  @Post()
  @Permissions('suppliers.create')
  @ApiOperation({ summary: 'Create a supplier' })
  create(@Body() dto: CreateSupplierDto, @Req() request: Request) {
    return this.suppliersService.create(dto, request);
  }

  @Patch(':id')
  @Permissions('suppliers.update')
  @ApiOperation({ summary: 'Update a supplier' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @Req() request: Request) {
    return this.suppliersService.update(id, dto, request);
  }

  @Delete(':id')
  @Permissions('suppliers.delete')
  @ApiOperation({ summary: 'Delete a supplier' })
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.suppliersService.remove(id, request);
  }
}