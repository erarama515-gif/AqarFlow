import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TenantContextModule } from '../../shared/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

import { PhoneNormalizerService } from './domain/phone-normalizer.service';
import { ArabicNameNormalizer } from './domain/arabic-name.service';
import { LeadDeduplicatorService } from './domain/lead-deduplicator.service';
import { DistributionEngine } from './domain/distribution.engine';
import { LeadScorerService } from './domain/lead-scorer.service';
import { LeadService } from './application/lead.service';
import { SlaMonitorJob } from './application/sla-monitor.job';
import { LeadController } from './presentation/lead.controller';
import { LeadWebhookController } from './presentation/lead-webhook.controller';

@Module({
  imports: [IamModule, TenantContextModule, AuditModule],
  providers: [
    PhoneNormalizerService,
    ArabicNameNormalizer,
    LeadDeduplicatorService,
    DistributionEngine,
    LeadScorerService,
    LeadService,
    SlaMonitorJob,
  ],
  controllers: [LeadController, LeadWebhookController],
  exports: [
    LeadService,
    PhoneNormalizerService,
    ArabicNameNormalizer,
    LeadScorerService,
  ],
})
export class LeadModule {}
