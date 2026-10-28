import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { ContactService } from '../application/contact.service';
import { CreateContactDto, ListContactsQueryDto, UpdateContactDto } from './contact.dto';
import { RequirePermissions } from '../../iam/decorators/permissions.decorator';
import { PERMISSIONS } from '../../iam/domain/permissions.catalog';

@ApiTags('Contacts')
@Controller({ path: 'contacts', version: '1' })
export class ContactController {
  constructor(private readonly contacts: ContactService) {}

  @RequirePermissions(PERMISSIONS.CONTACT_CREATE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a contact' })
  async create(@Body() dto: CreateContactDto): Promise<{ id: string }> {
    return { id: await this.contacts.create(dto) };
  }

  @RequirePermissions(PERMISSIONS.CONTACT_READ)
  @Get()
  @ApiOperation({ summary: 'List contacts' })
  async list(@Query() q: ListContactsQueryDto, @Res({ passthrough: true }) res: Response) {
    const { items, total } = await this.contacts.list(q);
    res.setHeader('X-Total-Count', total.toString());
    return items;
  }

  @RequirePermissions(PERMISSIONS.CONTACT_READ)
  @Get(':id')
  @ApiOperation({ summary: 'Contact 360 detail' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.contacts.findById(id);
  }

  @RequirePermissions(PERMISSIONS.CONTACT_UPDATE)
  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a contact' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateContactDto,
  ): Promise<void> {
    await this.contacts.update(id, dto);
  }
}
