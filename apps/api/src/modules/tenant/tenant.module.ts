import { Module } from '@nestjs/common';
import { TenantContextModule } from '../../shared/tenant/tenant.module';
import { IamModule } from '../iam/iam.module';
import { AuditModule } from '../audit/audit.module';

import { TenantService } from './application/tenant.service';
import { BranchService } from './application/branch.service';
import { TenantController } from './presentation/tenant.controller';

@Module({
  imports: [TenantContextModule, IamModule, AuditModule],
  providers: [TenantService, BranchService],
  controllers: [TenantController],
  exports: [TenantService, BranchService],
})
export class TenantModule {}
