import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { DashboardService, type ChartRange, type DashboardPeriod } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Permissions('dashboard.view')
  @ApiOperation({ summary: 'KPIs for today, week and month' })
  summary() {
    return this.dashboardService.summary();
  }

  @Get('sales-chart')
  @Permissions('dashboard.view')
  @ApiOperation({ summary: 'Sales trend data (week / month / year)' })
  salesChart(@Query('range') range?: ChartRange) {
    return this.dashboardService.salesChart(range || 'week');
  }

  @Get('top-products')
  @Permissions('dashboard.view')
  @ApiOperation({ summary: 'Top selling products' })
  topProducts(@Query('period') period?: DashboardPeriod, @Query('limit') limit?: string) {
    return this.dashboardService.topProducts(period || 'month', Math.min(Math.max(Number(limit) || 5, 1), 20));
  }

  @Get('categories')
  @Permissions('dashboard.view')
  @ApiOperation({ summary: 'Sales by category' })
  categories(@Query('period') period?: DashboardPeriod) {
    return this.dashboardService.categories(period || 'month');
  }

  @Get('alerts')
  @Permissions('dashboard.view')
  @ApiOperation({ summary: 'Low stock, expiring, expired & pending approvals' })
  alerts() {
    return this.dashboardService.alerts();
  }
}