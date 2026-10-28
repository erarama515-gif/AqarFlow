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

import { UserService } from '../application/user.service';
import { InviteUserDto, ListUsersQueryDto } from './user.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequirePermissions, Authenticated } from '../decorators/permissions.decorator';
import { AccessTokenPayload } from '../application/token.service';
import { PERMISSIONS } from '../domain/permissions.catalog';

@ApiTags('Users')
@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(private readonly users: UserService) {}

  @Authenticated()
  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user' })
  async me(@CurrentUser() user: AccessTokenPayload): Promise<unknown> {
    return this.users.findById(user.sub);
  }

  @RequirePermissions(PERMISSIONS.USER_READ)
  @Get()
  @ApiOperation({ summary: 'List team members' })
  async list(@Query() q: ListUsersQueryDto, @Res({ passthrough: true }) res: Response) {
    const { items, total } = await this.users.list({
      page: q.page,
      limit: q.limit,
      search: q.search,
    });
    res.setHeader('X-Total-Count', total.toString());
    return items;
  }

  @RequirePermissions(PERMISSIONS.USER_INVITE)
  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a new team member' })
  async invite(@Body() dto: InviteUserDto): Promise<{ id: string }> {
    const id = await this.users.invite(dto);
    return { id };
  }

  @RequirePermissions(PERMISSIONS.USER_READ)
  @Get(':id')
  @ApiOperation({ summary: 'Get user details' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<unknown> {
    return this.users.findById(id);
  }

  @RequirePermissions(PERMISSIONS.USER_SUSPEND)
  @Post(':id/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Suspend a user' })
  async suspend(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.users.suspend(id);
  }

  @RequirePermissions(PERMISSIONS.USER_SUSPEND)
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reactivate a suspended user' })
  async reactivate(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.users.reactivate(id);
  }
}
