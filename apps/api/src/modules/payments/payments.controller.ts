import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreatePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Permissions('payments.view')
  @ApiOperation({ summary: 'List payments with type and date filters' })
  findAll(
    @Query()
    query: PaginationQuery & {
      type?: string;
      paymentMethod?: string;
      customerId?: string;
      supplierId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
  ) {
    return this.paymentsService.findAll(query);
  }

  @Post()
  @Permissions('payments.create')
  @ApiOperation({ summary: 'Record a payment (customer, supplier or expense)' })
  create(@Body() dto: CreatePaymentDto, @Req() request: Request) {
    return this.paymentsService.create(dto, request);
  }

  @Get(':id')
  @Permissions('payments.view')
  @ApiOperation({ summary: 'Get a payment' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }
}