import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateEmployeeDto, UpdateEmployeeDto, LinkUserDto } from './dto/employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Permissions('employees.view')
  @ApiOperation({ summary: 'List employees' })
  findAll(@Query() query: PaginationQuery) {
    return this.employeesService.findAll(query);
  }

  @Get('options')
  @Permissions('employees.view')
  @ApiOperation({ summary: 'Lightweight employee list for dropdowns' })
  findAllNames() {
    return this.employeesService.findAllNames();
  }

  @Get(':id')
  @Permissions('employees.view')
  @ApiOperation({ summary: 'Get an employee' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @Permissions('employees.create')
  @ApiOperation({ summary: 'Create an employee' })
  create(@Body() dto: CreateEmployeeDto, @Req() request: Request) {
    return this.employeesService.create(dto, request);
  }

  @Patch(':id')
  @Permissions('employees.update')
  @ApiOperation({ summary: 'Update an employee' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @Req() request: Request) {
    return this.employeesService.update(id, dto, request);
  }

  @Patch(':id/link-user')
  @Permissions('employees.update')
  @ApiOperation({ summary: 'Link an employee to a user account (or unlink)' })
  linkUser(@Param('id') id: string, @Body() dto: LinkUserDto, @Req() request: Request) {
    return this.employeesService.linkUser(id, dto, request);
  }

  @Delete(':id')
  @Permissions('employees.delete')
  @ApiOperation({ summary: 'Delete an employee' })
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.employeesService.remove(id, request);
  }
}