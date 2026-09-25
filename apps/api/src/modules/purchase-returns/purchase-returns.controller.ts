import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { PurchaseReturnsService } from './purchase-returns.service';

@ApiTags('Purchase Returns')
@ApiBearerAuth()
@Controller('purchase-returns')
export class PurchaseReturnsController {
  constructor(private readonly purchaseReturnsService: PurchaseReturnsService) {}

  @Get()
  @Permissions('purchases.return')
  @ApiOperation({ summary: 'List purchase returns' })
  findAll(@Query() query: PaginationQuery & { status?: string; supplierId?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    return this.purchaseReturnsService.findAll(query);
  }

  @Post()
  @Permissions('purchases.return')
  @ApiOperation({ summary: 'Create a purchase return (reduces batch stock)' })
  create(@Body() dto: CreatePurchaseReturnDto, @Req() request: Request) {
    return this.purchaseReturnsService.create(dto, request);
  }

  @Get(':id')
  @Permissions('purchases.return')
  @ApiOperation({ summary: 'Get a purchase return detail' })
  findOne(@Param('id') id: string) {
    return this.purchaseReturnsService.findOne(id);
  }
}