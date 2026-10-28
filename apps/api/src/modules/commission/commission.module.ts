import { Module, OnModuleInit } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TenantContextModule } from '../../shared/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { OutboxPublisher } from '../../shared/outbox/outbox.publisher';

import { CommissionService } from './application/commission.service';
import { CommissionController } from './presentation/commission.controller';

@Module({
  imports: [IamModule, TenantContextModule, AuditModule],
  providers: [CommissionService],
  controllers: [CommissionController],
  exports: [CommissionService],
})
export class CommissionModule implements OnModuleInit {
  constructor(
    private readonly outbox: OutboxPublisher,
    private readonly commissions: CommissionService,
  ) {}

  /**
   * Wire the commission engine to fire whenever a deal is won. We deliberately
   * subscribe via the OutboxPublisher rather than Nest's EventEmitter so the
   * trigger survives a process crash between transaction commit and event
   * dispatch.
   */
  onModuleInit(): void {
    this.outbox.on('deal.won', async (envelope: any) => {
      try {
        if (envelope?.tenantId && envelope?.aggregateId) {
          await this.commissions.calculateForDeal(envelope.tenantId, envelope.aggregateId);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[commission] failed to handle deal.won', (err as Error).message);
      }
    });
  }
}
