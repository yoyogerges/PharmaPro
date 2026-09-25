import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Response } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SalesService, type SalesFilter } from './sales.service';
import { PosService } from '../pos/pos.service';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly posService: PosService,
  ) {}

  @Get()
  @Permissions('sales.view')
  @ApiOperation({ summary: 'List sales with filters (date, customer, status)' })
  findAll(@Query() query: PaginationQuery & { status?: string; paymentStatus?: string; customerId?: string; dateFrom?: string; dateTo?: string; search?: string }) {
    return this.salesService.findAll(query);
  }

  @Get('export')
  @Permissions('sales.export')
  @ApiOperation({ summary: 'Export sales to CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(@Query() query: SalesFilter, @Res() res: Response) {
    const csv = await this.salesService.exportCsv(query);
    res.setHeader('Content-Disposition', `attachment; filename="sales-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  @Get(':id')
  @Permissions('sales.view')
  @ApiOperation({ summary: 'Get a sale with items + payments' })
  findOne(@Param('id') id: string) {
    return this.posService.findOne(id);
  }

  @Get('receipt/:id')
  @Permissions('sales.view')
  @ApiOperation({ summary: 'Get receipt data for printing' })
  receipt(@Param('id') id: string) {
    return this.posService.receipt(id);
  }
}