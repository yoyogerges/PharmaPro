import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreatePrescriptionDto, DispenseDto, UpdatePrescriptionDto } from './dto/prescription.dto';
import { PrescriptionsService } from './prescriptions.service';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  @Permissions('prescriptions.view')
  @ApiOperation({ summary: 'List prescriptions with status and date filters' })
  findAll(@Query() query: PaginationQuery & { status?: string; customerId?: string; search?: string; dateFrom?: string; dateTo?: string }) {
    return this.prescriptionsService.findAll(query);
  }

  @Post()
  @Permissions('prescriptions.create')
  @ApiOperation({ summary: 'Create a prescription' })
  create(@Body() dto: CreatePrescriptionDto, @Req() request: Request) {
    return this.prescriptionsService.create(dto, request);
  }

  @Get(':id')
  @Permissions('prescriptions.view')
  @ApiOperation({ summary: 'Get a prescription with items and linked sales' })
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('prescriptions.update')
  @ApiOperation({ summary: 'Update a pending prescription' })
  update(@Param('id') id: string, @Body() dto: UpdatePrescriptionDto, @Req() request: Request) {
    return this.prescriptionsService.update(id, dto, request);
  }

  @Post(':id/dispense')
  @Permissions('prescriptions.dispense')
  @ApiOperation({ summary: 'Dispense items (decrements stock FEFO, tracks quantities)' })
  dispense(@Param('id') id: string, @Body() dto: DispenseDto, @Req() request: Request) {
    return this.prescriptionsService.dispense(id, dto, request);
  }

  @Post(':id/cancel')
  @Permissions('prescriptions.update')
  @ApiOperation({ summary: 'Cancel a prescription that is not fully dispensed' })
  cancel(@Param('id') id: string, @Req() request: Request) {
    return this.prescriptionsService.cancel(id, request);
  }
}