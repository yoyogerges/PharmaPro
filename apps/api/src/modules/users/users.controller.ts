import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions('users.view')
  @ApiOperation({ summary: 'List users' })
  findAll(@Query() query: PaginationQuery) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Permissions('users.view')
  @ApiOperation({ summary: 'Get a user' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions('users.create')
  @ApiOperation({ summary: 'Create a user' })
  create(@Body() dto: CreateUserDto, @Req() request: Request) {
    return this.usersService.create(dto, request);
  }

  @Patch(':id')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Update a user (roles, status, profile, or reset password)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() request: Request) {
    return this.usersService.update(id, dto, request);
  }

  @Delete(':id')
  @Permissions('users.delete')
  @ApiOperation({ summary: 'Soft-delete a user' })
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.usersService.remove(id, request);
  }
}