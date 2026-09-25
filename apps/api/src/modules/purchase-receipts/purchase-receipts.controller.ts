import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { PurchaseReceiptsService } from './purchase-receipts.service';

@ApiTags('Purchase Receipts')
@ApiBearerAuth()
@Controller('purchase-receipts')
export class PurchaseReceiptsController {
  constructor(private readonly purchaseReceiptsService: PurchaseReceiptsService) {}

  @Get()
  @Permissions('purchases.view')
  @ApiOperation({ summary: 'List purchase receipts' })
  findAll(@Query() query: PaginationQuery & { supplierId?: string; purchaseOrderId?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    return this.purchaseReceiptsService.findAll(query);
  }

  @Post()
  @Permissions('purchases.receive')
  @ApiOperation({ summary: 'Create a purchase receipt (creates batches and updates stock)' })
  create(@Body() dto: CreateReceiptDto, @Req() request: Request) {
    return this.purchaseReceiptsService.create(dto, request);
  }

  @Get(':id')
  @Permissions('purchases.view')
  @ApiOperation({ summary: 'Get a purchase receipt detail' })
  findOne(@Param('id') id: string) {
    return this.purchaseReceiptsService.findOne(id);
  }
}