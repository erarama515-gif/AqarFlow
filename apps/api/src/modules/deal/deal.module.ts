import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TenantContextModule } from '../../shared/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

import { DealService } from './application/deal.service';
import { DealController } from './presentation/deal.controller';

@Module({
  imports: [IamModule, TenantContextModule, AuditModule],
  providers: [DealService],
  controllers: [DealController],
  exports: [DealService],
})
export class DealModule {}
