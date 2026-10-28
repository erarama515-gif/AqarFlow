import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TenantContextModule } from '../../shared/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

import { ActivityService } from './application/activity.service';
import { ViewingService } from './application/viewing.service';
import { ActivityController } from './presentation/activity.controller';

@Module({
  imports: [IamModule, TenantContextModule, AuditModule],
  providers: [ActivityService, ViewingService],
  controllers: [ActivityController],
  exports: [ActivityService, ViewingService],
})
export class ActivityModule {}
