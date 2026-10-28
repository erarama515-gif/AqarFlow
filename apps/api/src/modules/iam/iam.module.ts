import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { TenantContextModule } from '../../shared/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

import { PasswordService } from './domain/password.service';
import { AuthService } from './application/auth.service';
import { TokenService } from './application/token.service';
import { UserService } from './application/user.service';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/jwt-auth.guard';
import { PermissionsGuard } from './infrastructure/permissions.guard';
import { AuthController } from './presentation/auth.controller';
import { UserController } from './presentation/user.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwt.accessSecret'),
        signOptions: { expiresIn: config.get<string>('app.jwt.accessTtl', '15m') },
      }),
    }),
    TenantContextModule,
    AuditModule,
  ],
  controllers: [AuthController, UserController],
  providers: [
    PasswordService,
    TokenService,
    AuthService,
    UserService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
  ],
  exports: [PasswordService, TokenService, UserService, JwtAuthGuard, PermissionsGuard],
})
export class IamModule {}
