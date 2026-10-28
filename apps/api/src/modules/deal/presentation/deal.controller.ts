import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { DealService } from '../application/deal.service';
import { CreateDealDto, ListDealsQueryDto, MoveStageDto } from './deal.dto';
import { RequirePermissions } from '../../iam/decorators/permissions.decorator';
import { PERMISSIONS } from '../../iam/domain/permissions.catalog';

@ApiTags('Deals')
@Controller({ path: 'deals', version: '1' })
export class DealController {
  constructor(private readonly deals: DealService) {}

  @RequirePermissions(PERMISSIONS.DEAL_CREATE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a deal' })
  async create(@Body() dto: CreateDealDto): Promise<{ id: string }> {
    return {
      id: await this.deals.create({
        ...dto,
        expectedCloseAt: dto.expectedCloseAt ? new Date(dto.expectedCloseAt) : undefined,
      }),
    };
  }

  @RequirePermissions(PERMISSIONS.DEAL_READ_ALL)
  @Get()
  @ApiOperation({ summary: 'List deals' })
  async list(@Query() q: ListDealsQueryDto, @Res({ passthrough: true }) res: Response) {
    const { items, total } = await this.deals.list(q);
    res.setHeader('X-Total-Count', total.toString());
    return items;
  }

  @RequirePermissions(PERMISSIONS.DEAL_READ_OWN)
  @Get('kanban')
  @ApiOperation({ summary: 'Kanban view (agents see their own deals; managers see the whole board)' })
  async kanban(@Query('pipelineCode') pipelineCode?: string) {
    return this.deals.kanban(pipelineCode);
  }

  @RequirePermissions(PERMISSIONS.DEAL_READ_OWN)
  @Get('forecast')
  @ApiOperation({ summary: 'Pipeline forecast (own deals or full team based on scope)' })
  async forecast() {
    return this.deals.forecast();
  }

  @RequirePermissions(PERMISSIONS.DEAL_READ_OWN)
  @Get(':id')
  @ApiOperation({ summary: 'Deal detail' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.deals.findById(id);
  }

  @RequirePermissions(PERMISSIONS.DEAL_UPDATE)
  @Post(':id/move-stage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move deal to another stage' })
  async moveStage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MoveStageDto,
  ): Promise<void> {
    await this.deals.moveToStage(id, dto.toStageCode, dto.notes);
  }
}
