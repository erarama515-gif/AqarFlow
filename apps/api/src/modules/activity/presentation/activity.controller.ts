import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { ActivityService } from '../application/activity.service';
import { ViewingService } from '../application/viewing.service';
import { CalendarQueryDto, CreateActivityDto, ScheduleViewingDto, ViewingFeedbackDto } from './activity.dto';
import { RequirePermissions } from '../../iam/decorators/permissions.decorator';
import { PERMISSIONS } from '../../iam/domain/permissions.catalog';

@ApiTags('Activities')
@Controller({ version: '1' })
export class ActivityController {
  constructor(
    private readonly activities: ActivityService,
    private readonly viewings: ViewingService,
  ) {}

  @RequirePermissions(PERMISSIONS.ACTIVITY_CREATE)
  @Post('activities')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a new activity' })
  async create(@Body() dto: CreateActivityDto): Promise<{ id: string }> {
    return {
      id: await this.activities.create({
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      }),
    };
  }

  @RequirePermissions(PERMISSIONS.ACTIVITY_READ)
  @Get('activities')
  @ApiOperation({ summary: 'List activities for a given entity' })
  async list(@Query() q: { leadId?: string; contactId?: string; dealId?: string; propertyId?: string; page?: number; limit?: number }, @Res({ passthrough: true }) res: Response) {
    const { items, total } = await this.activities.list(q);
    res.setHeader('X-Total-Count', total.toString());
    return items;
  }

  @RequirePermissions(PERMISSIONS.ACTIVITY_READ)
  @Get('activities/calendar')
  @ApiOperation({ summary: 'Calendar view between two dates' })
  async calendar(@Query() q: CalendarQueryDto) {
    return this.activities.calendar({
      from: new Date(q.from),
      to: new Date(q.to),
      userId: q.userId,
    });
  }

  @RequirePermissions(PERMISSIONS.ACTIVITY_UPDATE)
  @Post('activities/:id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark an activity as completed' })
  async complete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.activities.complete(id);
  }

  // Viewings (specialised activity) ------------------------------------------
  @RequirePermissions(PERMISSIONS.ACTIVITY_CREATE)
  @Post('viewings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule a property viewing' })
  async scheduleViewing(@Body() dto: ScheduleViewingDto): Promise<{ id: string }> {
    return {
      id: await this.viewings.schedule({
        ...dto,
        scheduledAt: new Date(dto.scheduledAt),
      }),
    };
  }

  @RequirePermissions(PERMISSIONS.ACTIVITY_UPDATE)
  @Post('viewings/:id/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmViewing(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.viewings.confirm(id);
  }

  @RequirePermissions(PERMISSIONS.ACTIVITY_UPDATE)
  @Post('viewings/:id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async completeViewing(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ViewingFeedbackDto,
  ): Promise<void> {
    await this.viewings.complete(id, dto.feedback, dto.rating);
  }

  @RequirePermissions(PERMISSIONS.ACTIVITY_UPDATE)
  @Post('viewings/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelViewing(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reason?: string },
  ): Promise<void> {
    await this.viewings.cancel(id, body.reason);
  }
}
