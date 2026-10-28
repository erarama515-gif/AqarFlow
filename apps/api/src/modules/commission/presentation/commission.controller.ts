import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { CommissionService } from '../application/commission.service';
import { CreateCommissionRuleDto, ListCommissionsQueryDto, MarkPaidDto } from './commission.dto';
import { RequirePermissions } from '../../iam/decorators/permissions.decorator';
import { PERMISSIONS } from '../../iam/domain/permissions.catalog';

@ApiTags('Commissions')
@Controller({ version: '1' })
export class CommissionController {
  constructor(private readonly commissions: CommissionService) {}

  @RequirePermissions(PERMISSIONS.COMMISSION_RULES_MANAGE)
  @Post('commission-rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a commission rule' })
  async createRule(@Body() dto: CreateCommissionRuleDto): Promise<{ id: string }> {
    return { id: await this.commissions.createRule(dto as any) };
  }

  @RequirePermissions(PERMISSIONS.COMMISSION_READ_ALL)
  @Get('commission-entries')
  @ApiOperation({ summary: 'List commission entries' })
  async list(@Query() q: ListCommissionsQueryDto, @Res({ passthrough: true }) res: Response) {
    const { items, total } = await this.commissions.list(q);
    res.setHeader('X-Total-Count', total.toString());
    return items;
  }

  @RequirePermissions(PERMISSIONS.COMMISSION_READ_OWN)
  @Get('commission-entries/my')
  @ApiOperation({ summary: 'My commission entries (pending + paid)' })
  async myCommissions() {
    return this.commissions.myCommissions();
  }

  @RequirePermissions(PERMISSIONS.COMMISSION_APPROVE)
  @Post('commission-entries/:id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Approve a commission entry for payment' })
  async approve(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.commissions.approve(id);
  }

  @RequirePermissions(PERMISSIONS.COMMISSION_PAY)
  @Post('commission-entries/:id/pay')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a commission as paid' })
  async pay(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: MarkPaidDto): Promise<void> {
    await this.commissions.markPaid(id, dto.paymentMethod, dto.paymentRef);
  }
}
