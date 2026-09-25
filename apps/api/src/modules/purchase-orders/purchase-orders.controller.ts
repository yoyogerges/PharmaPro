import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreatePurchaseOrderDto } from './dto/purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @Permissions('purchases.view')
  @ApiOperation({ summary: 'List purchase orders' })
  findAll(@Query() query: PaginationQuery & { status?: string; supplierId?: string; search?: string }) {
    return this.purchaseOrdersService.findAll(query);
  }

  @Post()
  @Permissions('purchases.create')
  @ApiOperation({ summary: 'Create a purchase order (DRAFT)' })
  create(@Body() dto: CreatePurchaseOrderDto, @Req() request: Request) {
    return this.purchaseOrdersService.create(dto, request);
  }

  @Get(':id')
  @Permissions('purchases.view')
  @ApiOperation({ summary: 'Get a purchase order with items and receipts' })
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Patch(':id')
  @Permissions('purchases.create')
  @ApiOperation({ summary: 'Update a draft purchase order' })
  update(@Param('id') id: string, @Body() dto: Partial<CreatePurchaseOrderDto>, @Req() request: Request) {
    return this.purchaseOrdersService.update(id, dto, request);
  }

  @Post(':id/submit')
  @Permissions('purchases.create')
  @ApiOperation({ summary: 'Submit a purchase order for approval' })
  submit(@Param('id') id: string, @Req() request: Request) {
    return this.purchaseOrdersService.submit(id, request);
  }

  @Post(':id/approve')
  @Permissions('purchases.approve')
  @ApiOperation({ summary: 'Approve a purchase order' })
  approve(@Param('id') id: string, @Req() request: Request) {
    return this.purchaseOrdersService.approve(id, request);
  }

  @Post(':id/reject')
  @Permissions('purchases.approve')
  @ApiOperation({ summary: 'Reject a purchase order back to draft' })
  reject(@Param('id') id: string, @Req() request: Request) {
    return this.purchaseOrdersService.reject(id, request);
  }

  @Post(':id/cancel')
  @Permissions('purchases.create')
  @ApiOperation({ summary: 'Cancel a purchase order' })
  cancel(@Param('id') id: string, @Req() request: Request) {
    return this.purchaseOrdersService.cancel(id, request);
  }
}