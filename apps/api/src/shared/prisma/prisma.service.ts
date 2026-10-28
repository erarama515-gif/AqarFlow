import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * PrismaService
 *
 * Wraps the generated PrismaClient with:
 *   - automatic connection lifecycle bound to Nest startup/shutdown
 *   - slow-query logging
 *   - typed access to enums and models elsewhere in the codebase
 *
 * Multi-tenancy is enforced by query filters and explicit `tenantId` columns,
 * surfaced through repositories (not in this service directly) to keep the
 * Prisma layer transport-agnostic.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({
      datasources: {
        db: { url: config.get<string>('app.db.url') },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    // Slow-query log (>200ms) — invaluable for spotting missing indexes
    this.$on('query' as never, (event: Prisma.QueryEvent) => {
      if (event.duration > 200) {
        this.logger.warn(
          `[slow-query ${event.duration}ms] ${event.query} — params=${event.params}`,
        );
      }
    });

    this.$on('warn' as never, (event: Prisma.LogEvent) => {
      this.logger.warn(`Prisma warning: ${event.message}`);
    });

    this.$on('error' as never, (event: Prisma.LogEvent) => {
      this.logger.error(`Prisma error: ${event.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('✅ Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('🔌 Prisma disconnected');
  }
}
