import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { BatchesService } from './batches.service';

@ApiTags('Batches')
@ApiBearerAuth()
@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  @Permissions('batches.view')
  @ApiOperation({ summary: 'List batches (paginated)' })
  findAll(@Query() query: PaginationQuery & { productId?: string; status?: string; search?: string }) {
    return this.batchesService.findAll(query);
  }

  @Get('product/:productId')
  @Permissions('batches.view')
  @ApiOperation({ summary: 'Batches for a specific product' })
  findByProduct(@Param('productId') productId: string) {
    return this.batchesService.findByProduct(productId);
  }

  @Get('expiry/expired')
  @Permissions('batches.view')
  @ApiOperation({ summary: 'Expired batches' })
  findExpired() {
    return this.batchesService.findExpired();
  }

  @Get('expiry/near')
  @Permissions('batches.view')
  @ApiOperation({ summary: 'Near-expiry batches' })
  findNearExpiry(@Query('days') days?: string) {
    return this.batchesService.findNearExpiry(Number(days) || 30);
  }

  @Get(':id')
  @Permissions('batches.view')
  @ApiOperation({ summary: 'Get a batch' })
  findOne(@Param('id') id: string) {
    return this.batchesService.findOne(id);
  }
}