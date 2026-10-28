import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ClsModule, ClsMiddleware } from 'nestjs-cls';

import { appConfig, validateEnv } from './shared/config/app.config';
import { PrismaModule } from './shared/prisma/prisma.module';
import { RedisModule } from './shared/redis/redis.module';
import { TenantContextMiddleware } from './shared/tenant/tenant-context.middleware';
import { HealthController } from './shared/health/health.controller';

import { IamModule } from './modules/iam/iam.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { LeadModule } from './modules/lead/lead.module';
import { ContactModule } from './modules/contact/contact.module';
import { PropertyModule } from './modules/property/property.module';
import { DealModule } from './modules/deal/deal.module';
import { ActivityModule } from './modules/activity/activity.module';
import { MatchingModule } from './modules/matching/matching.module';
import { CommissionModule } from './modules/commission/commission.module';
import { NotificationModule } from './modules/notification/notification.module';
import { BookingModule } from './modules/booking/booking.module';
import { OutboxModule } from './shared/outbox/outbox.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    // Configuration ------------------------------------------------------------
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      validate: validateEnv,
    }),

    // Async-context propagation (request-id, tenant-id, user-id).
    // We mount ClsMiddleware manually below to guarantee it wraps our
    // TenantContextMiddleware (auto-mount in v4 is route-order sensitive).
    ClsModule.forRoot({
      global: true,
      middleware: { generateId: true, idGenerator: () => crypto.randomUUID() },
    }),

    // Scheduling (cron jobs) ---------------------------------------------------
    ScheduleModule.forRoot(),

    // Rate limiting ------------------------------------------------------------
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    // Infrastructure -----------------------------------------------------------
    PrismaModule,
    RedisModule,
    OutboxModule,

    // Domain modules -----------------------------------------------------------
    IamModule,
    TenantModule,
    LeadModule,
    ContactModule,
    PropertyModule,
    DealModule,
    ActivityModule,
    MatchingModule,
    CommissionModule,
    NotificationModule,
    BookingModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // ClsMiddleware MUST run first so downstream middlewares, guards, and
    // strategies can read/write the async-local store.
    consumer.apply(ClsMiddleware, TenantContextMiddleware).forRoutes('*');
  }
}
