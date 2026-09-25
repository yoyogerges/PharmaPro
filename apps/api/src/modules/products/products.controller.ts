import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import type { Request, Response } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Permissions('products.view')
  @ApiOperation({ summary: 'List products with stock' })
  findAll(@Query() query: PaginationQuery & { categoryId?: string; manufacturerId?: string; isActive?: string }) {
    return this.productsService.findAll(query);
  }

  @Get('export')
  @Permissions('products.export')
  @ApiOperation({ summary: 'Export products to CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(@Query() query: PaginationQuery & { categoryId?: string; manufacturerId?: string; isActive?: string }, @Res() res: Response) {
    const csv = await this.productsService.exportCsv(query);
    res.setHeader('Content-Disposition', `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  @Get(':id')
  @Permissions('products.view')
  @ApiOperation({ summary: 'Get a product with ingredients' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Permissions('products.create')
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreateProductDto, @Req() request: Request) {
    return this.productsService.create(dto, request);
  }

  @Patch(':id')
  @Permissions('products.update')
  @ApiOperation({ summary: 'Update a product' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() request: Request) {
    return this.productsService.update(id, dto, request);
  }

  @Delete(':id')
  @Permissions('products.delete')
  @ApiOperation({ summary: 'Soft-delete a product' })
  remove(@Param('id') id: string, @Req() request: Request) {
    return this.productsService.remove(id, request);
  }
}