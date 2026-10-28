import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { AuthService } from '../application/auth.service';
import { LoginDto, LogoutDto, RefreshDto, TokenResponseDto } from './auth.dto';
import { Public } from '../decorators/permissions.decorator';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<TokenResponseDto> {
    return this.auth.login({
      email: dto.email,
      password: dto.password,
      tenantHint: dto.tenantHint,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token (revoke old, issue new pair)' })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request): Promise<TokenResponseDto> {
    return this.auth.refresh({
      refreshToken: dto.refreshToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }
}
