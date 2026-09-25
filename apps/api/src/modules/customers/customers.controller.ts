import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CustomersService, type StatementQuery } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Permissions('customers.view')
  @ApiOperation({ summary: 'List customers' })
  findAll(@Query() query: PaginationQuery) {
    return this.customersService.findAll(query);
  }

  @Get('options')
  @Permissions('customers.view')
  @ApiOperation({ summary: 'Lightweight customer list for dropdowns' })
  findAllNames() {
    return this.customersService.findAllNames();
  }

  @Get(':id')
  @Permissions('customers.view')
  @ApiOperation({ summary: 'Get a customer' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Get(':id/statement')
  @Permissions('customers.view')
  @ApiOperation({ summary: 'Customer financial statement (sales, payments, returns)' })
  statement(@Param('id') id: string, @Query() query: StatementQuery) {
    return this.customersService.statement(id, query);
  }

  @Get(':id/sales')
  @Permissions('customers.view')
  @ApiOperation({ summary: 'Customer sales history' })
  sales(@Param('id') id: string, @Query() query: PaginationQuery) {
    return this.customersService.sales(id, query);
  }

  @Post()
  @Permissions('customers.create')
  @ApiOperation({ summary: 'Create a customer' })
  create(@Body() dto: CreateCustomerDto, @Req() request: Request) {
    return this.customersService.create(dto, request);
  }

  @Patch(':id')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Update a customer' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @Req() request: Request) {
    return this.customersService.update(id, dto, request);
  }

  @Delete(':id')
  @Permissions('customers.delete')
  @ApiOperation({ summary: 'Delete a customer' })
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.customersService.remove(id, request);
  }
}