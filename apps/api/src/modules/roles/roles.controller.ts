import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSION_DEFINITIONS, type PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles.view')
  @ApiOperation({ summary: 'List roles' })
  findAll(@Query() query: PaginationQuery) {
    return this.rolesService.findAll(query);
  }

  @Get('options')
  @Permissions('roles.view')
  @ApiOperation({ summary: 'Lightweight role list for dropdowns' })
  findAllNames() {
    return this.rolesService.findAllNames();
  }

  @Get('permissions')
  @Public()
  @ApiOperation({ summary: 'Canonical permission catalog grouped by module' })
  getPermissions() {
    return PERMISSION_DEFINITIONS;
  }

  @Get('permission-ids')
  @Permissions('roles.view')
  @ApiOperation({ summary: 'Permission rows with their database ids (for role forms)' })
  getPermissionIds() {
    return this.rolesService.getPermissionIds();
  }

  @Get(':id')
  @Permissions('roles.view')
  @ApiOperation({ summary: 'Get a role with its permissions' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Permissions('roles.create')
  @ApiOperation({ summary: 'Create a role' })
  create(@Body() dto: CreateRoleDto, @Req() request: Request) {
    return this.rolesService.create(dto, request);
  }

  @Patch(':id')
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Update a role and its permissions' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Req() request: Request) {
    return this.rolesService.update(id, dto, request);
  }

  @Delete(':id')
  @Permissions('roles.delete')
  @ApiOperation({ summary: 'Delete a non-system role' })
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.rolesService.remove(id, request);
  }
}