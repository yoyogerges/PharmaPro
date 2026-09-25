import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PosService } from './pos.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@ApiTags('POS')
@ApiBearerAuth()
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('sale/:id')
  @Permissions('sales.view')
  @ApiOperation({ summary: 'Get a sale by id' })
  getSale(@Param('id') id: string) {
    return this.posService.findOne(id);
  }

  @Get('product-search')
  @Permissions('sales.create')
  @ApiOperation({ summary: 'Quick product search for POS (name, sku, barcode)' })
  productSearch(@Query('q') q?: string) {
    return this.posService.productSearch(q);
  }

  @Get('barcode/:code')
  @Permissions('sales.create')
  @ApiOperation({ summary: 'Barcode lookup for POS' })
  barcodeLookup(@Param('code') code: string) {
    return this.posService.barcodeLookup(code);
  }

  @Post('sale')
  @Permissions('sales.create')
  @ApiOperation({ summary: 'Create a sale (transactional, decrements stock FEFO)' })
  createSale(@Body() dto: CreateSaleDto, @Req() request: Request) {
    return this.posService.createSale(dto, request);
  }
}