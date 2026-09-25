import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuditLogService, type AuditLogQuery } from './audit-log.service';

@ApiTags('Audit Log')
@ApiBearerAuth()
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Permissions('audit.view')
  @ApiOperation({ summary: 'Paginated audit log with filters' })
  findAll(@Query() query: AuditLogQuery) {
    return this.auditLogService.findAll(query);
  }

  @Get('entity/:type/:id')
  @Permissions('audit.view')
  @ApiOperation({ summary: 'Audit log for a specific entity' })
  findByEntity(@Param('type') entityType: string, @Param('id') entityId: string) {
    return this.auditLogService.findByEntity(entityType, entityId);
  }
}