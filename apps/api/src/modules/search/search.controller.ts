import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Permissions('search.global')
  @ApiOperation({ summary: 'Global search across products, customers, suppliers, manufacturers and sales' })
  search(@Query('q') q?: string, @Query('types') types?: string) {
    return this.searchService.search(q ?? '', types);
  }
}