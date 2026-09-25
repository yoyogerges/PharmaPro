import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginationQuery } from '@pharmapro/shared';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Permissions('notifications.view')
  @ApiOperation({ summary: 'List current user notifications (paginated)' })
  findAll(@CurrentUser() user: RequestUser, @Query() query: PaginationQuery) {
    return this.notificationsService.findAll(user.sub, query);
  }

  @Get('unread-count')
  @Permissions('notifications.view')
  @ApiOperation({ summary: 'Unread notifications count for current user' })
  unreadCount(@CurrentUser() user: RequestUser) {
    return this.notificationsService.unreadCount(user.sub);
  }

  @Patch('read-all')
  @Permissions('notifications.view')
  @ApiOperation({ summary: 'Mark all current user notifications as read' })
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Patch(':id/read')
  @Permissions('notifications.view')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.notificationsService.markRead(id, user.sub);
  }
}