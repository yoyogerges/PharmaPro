import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateStockAdjustmentDto } from './dto/stock-adjustment.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock-levels')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'Product stock summary' })
  stockLevels(@Query() query: PaginationQuery & { search?: string; categoryId?: string; isLowStock?: string; inStock?: string }) {
    return this.inventoryService.getStockLevels(query);
  }

  @Get('movements')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'Movement history (paginated)' })
  movements(@Query() query: PaginationQuery & { productId?: string; batchId?: string; type?: string; dateFrom?: string; dateTo?: string }) {
    return this.inventoryService.getMovements(query);
  }

  @Get('low-stock')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'Products below reorder level' })
  lowStock(@Query() query: PaginationQuery & { search?: string; categoryId?: string }) {
    return this.inventoryService.getLowStock(query);
  }

  @Get('valuation')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'Total stock value' })
  valuation() {
    return this.inventoryService.getValuation();
  }

  @Post('adjustments')
  @Permissions('inventory.adjust')
  @ApiOperation({ summary: 'Create a stock adjustment (pending)' })
  createAdjustment(@Body() dto: CreateStockAdjustmentDto, @Req() request: Request) {
    return this.inventoryService.createAdjustment(dto, request);
  }

  @Get('adjustments')
  @Permissions('inventory.view')
  @ApiOperation({ summary: 'List stock adjustments' })
  adjustments(@Query() query: PaginationQuery & { status?: string; productId?: string }) {
    return this.inventoryService.listAdjustments(query);
  }

  @Patch('adjustments/:id/approve')
  @Permissions('inventory.approve_adjustment')
  @ApiOperation({ summary: 'Approve a stock adjustment' })
  approveAdjustment(@Param('id') id: string, @Req() request: Request) {
    return this.inventoryService.approveAdjustment(id, request);
  }

  @Patch('adjustments/:id/reject')
  @Permissions('inventory.approve_adjustment')
  @ApiOperation({ summary: 'Reject a stock adjustment' })
  rejectAdjustment(@Param('id') id: string, @Req() request: Request) {
    return this.inventoryService.rejectAdjustment(id, request);
  }
}