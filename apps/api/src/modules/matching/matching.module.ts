import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TenantContextModule } from '../../shared/tenant/tenant.module';

import { MatchingService } from './application/matching.service';
import { MatchingController } from './presentation/matching.controller';

@Module({
  imports: [IamModule, TenantContextModule],
  providers: [MatchingService],
  controllers: [MatchingController],
  exports: [MatchingService],
})
export class MatchingModule {}
