import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { NotificationService } from '../application/notification.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { Authenticated } from '../../iam/decorators/permissions.decorator';

@ApiTags('Notifications')
@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly ctx: TenantContextService,
  ) {}

  @Authenticated()
  @Get('inbox')
  @ApiOperation({ summary: 'Notification inbox' })
  async inbox(
    @Query() q: { unreadOnly?: boolean; page?: number; limit?: number },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { items, total, unread } = await this.notifications.listInbox({
      userId: this.ctx.userId!,
      tenantId: this.ctx.requireTenantId(),
      unreadOnly: q.unreadOnly,
      page: q.page,
      limit: q.limit,
    });
    res.setHeader('X-Total-Count', total.toString());
    res.setHeader('X-Unread-Count', unread.toString());
    return items;
  }

  @Authenticated()
  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.notifications.markRead(id, this.ctx.userId!);
  }

  @Authenticated()
  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  async markAllRead(): Promise<void> {
    await this.notifications.markAllRead(this.ctx.userId!, this.ctx.requireTenantId());
  }
}
