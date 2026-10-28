import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { LeadService } from '../application/lead.service';
import {
  AssignLeadDto,
  ChangeLeadStatusDto,
  CreateLeadDto,
  ListLeadsQueryDto,
} from './lead.dto';
import { RequirePermissions } from '../../iam/decorators/permissions.decorator';
import { PERMISSIONS } from '../../iam/domain/permissions.catalog';

@ApiTags('Leads')
@Controller({ path: 'leads', version: '1' })
export class LeadController {
  constructor(private readonly leads: LeadService) {}

  @RequirePermissions(PERMISSIONS.LEAD_CREATE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Capture a new lead' })
  async create(@Body() dto: CreateLeadDto) {
    return this.leads.captureForCurrentTenant(dto);
  }

  @RequirePermissions(PERMISSIONS.LEAD_READ_ALL)
  @Get()
  @ApiOperation({ summary: 'Search & list leads' })
  async list(@Query() q: ListLeadsQueryDto, @Res({ passthrough: true }) res: Response) {
    const { items, total } = await this.leads.search(q);
    res.setHeader('X-Total-Count', total.toString());
    return items;
  }

  @RequirePermissions(PERMISSIONS.LEAD_READ_OWN)
  @Get('my-inbox')
  @ApiOperation({ summary: 'Agent inbox — leads assigned to me' })
  async inbox(@Query() q: ListLeadsQueryDto, @Res({ passthrough: true }) res: Response) {
    const { items, total } = await this.leads.myInbox(q);
    res.setHeader('X-Total-Count', total.toString());
    return items;
  }

  @RequirePermissions(PERMISSIONS.LEAD_READ_OWN)
  @Get(':id')
  @ApiOperation({ summary: 'Get lead detail (own leads for agents, all for managers)' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.findById(id);
  }

  @RequirePermissions(PERMISSIONS.LEAD_UPDATE)
  @Post(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change lead status' })
  async changeStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeLeadStatusDto,
  ): Promise<void> {
    await this.leads.changeStatus(id, dto.status, {
      lostReason: dto.lostReason,
      notes: dto.notes,
    });
  }

  @RequirePermissions(PERMISSIONS.LEAD_ASSIGN)
  @Post(':id/assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Manually reassign lead to a user' })
  async assign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignLeadDto,
  ): Promise<void> {
    await this.leads.assign(id, dto.userId, dto.reason);
  }

  @RequirePermissions(PERMISSIONS.LEAD_CONVERT)
  @Post(':id/convert-to-contact')
  @ApiOperation({ summary: 'Convert lead to a contact (idempotent)' })
  async convert(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.leads.convertToContact(id);
  }
}
