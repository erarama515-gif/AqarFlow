import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TenantContextModule } from '../../shared/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { LeadModule } from '../lead/lead.module'; // for phone/name normalizers

import { ContactService } from './application/contact.service';
import { ContactController } from './presentation/contact.controller';

@Module({
  imports: [IamModule, TenantContextModule, AuditModule, LeadModule],
  providers: [ContactService],
  controllers: [ContactController],
  exports: [ContactService],
})
export class ContactModule {}
