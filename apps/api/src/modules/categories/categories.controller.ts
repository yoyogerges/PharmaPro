import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Permissions('categories.view')
  @ApiOperation({ summary: 'Category tree with product counts' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('options')
  @Permissions('categories.view')
  @ApiOperation({ summary: 'Lightweight category list for dropdowns' })
  findAllNames() {
    return this.categoriesService.findAllNames();
  }

  @Get(':id')
  @Permissions('categories.view')
  @ApiOperation({ summary: 'Get a category' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Permissions('categories.create')
  @ApiOperation({ summary: 'Create a category' })
  create(@Body() dto: CreateCategoryDto, @Req() request: Request) {
    return this.categoriesService.create(dto, request);
  }

  @Patch(':id')
  @Permissions('categories.update')
  @ApiOperation({ summary: 'Update a category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @Req() request: Request) {
    return this.categoriesService.update(id, dto, request);
  }

  @Delete(':id')
  @Permissions('categories.delete')
  @ApiOperation({ summary: 'Delete a category' })
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.categoriesService.remove(id, request);
  }
}