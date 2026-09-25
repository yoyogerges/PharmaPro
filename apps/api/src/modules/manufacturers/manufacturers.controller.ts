import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateManufacturerDto, UpdateManufacturerDto } from './dto/manufacturer.dto';
import { ManufacturersService } from './manufacturers.service';

@ApiTags('Manufacturers')
@ApiBearerAuth()
@Controller('manufacturers')
export class ManufacturersController {
  constructor(private readonly manufacturersService: ManufacturersService) {}

  @Get()
  @Permissions('manufacturers.view')
  @ApiOperation({ summary: 'List manufacturers' })
  findAll(@Query() query: PaginationQuery) {
    return this.manufacturersService.findAll(query);
  }

  @Get('options')
  @Permissions('manufacturers.view')
  @ApiOperation({ summary: 'Lightweight manufacturer list for dropdowns' })
  findAllNames() {
    return this.manufacturersService.findAllNames();
  }

  @Get(':id')
  @Permissions('manufacturers.view')
  @ApiOperation({ summary: 'Get a manufacturer' })
  findOne(@Param('id') id: string) {
    return this.manufacturersService.findOne(id);
  }

  @Post()
  @Permissions('manufacturers.create')
  @ApiOperation({ summary: 'Create a manufacturer' })
  create(@Body() dto: CreateManufacturerDto, @Req() request: Request) {
    return this.manufacturersService.create(dto, request);
  }

  @Patch(':id')
  @Permissions('manufacturers.update')
  @ApiOperation({ summary: 'Update a manufacturer' })
  update(@Param('id') id: string, @Body() dto: UpdateManufacturerDto, @Req() request: Request) {
    return this.manufacturersService.update(id, dto, request);
  }

  @Delete(':id')
  @Permissions('manufacturers.delete')
  @ApiOperation({ summary: 'Delete a manufacturer' })
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.manufacturersService.remove(id, request);
  }
}