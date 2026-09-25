import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ReportsService, type ReportFilters } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Permissions('reports.view')
  @ApiOperation({ summary: 'List all report definitions' })
  list() {
    return this.reportsService.listDefinitions();
  }

  @Get(':type/export')
  @Permissions('reports.export')
  @ApiOperation({ summary: 'Export a report (CSV)' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(@Param('type') type: string, @Query() query: ReportFilters, @Res() res: Response) {
    const result = await this.reportsService.generate(type, {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: query.limit,
    });
    res.setHeader('Content-Disposition', `attachment; filename="${result.type}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(this.reportsService.toCsv(result));
  }

  @Get(':type')
  @Permissions('reports.view')
  @ApiOperation({ summary: 'Generate a report' })
  generate(@Param('type') type: string, @Query() query: ReportFilters) {
    return this.reportsService.generate(type, {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: query.limit,
    });
  }
}