import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TenantContextModule } from '../../shared/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

import { PropertyService } from './application/property.service';
import { MasterProjectService } from './application/master-project.service';
import { ReservationService } from './application/reservation.service';
import { PaymentPlanService } from './application/payment-plan.service';
import { PropertyController } from './presentation/property.controller';

@Module({
  imports: [IamModule, TenantContextModule, AuditModule],
  providers: [PropertyService, MasterProjectService, ReservationService, PaymentPlanService],
  controllers: [PropertyController],
  exports: [PropertyService, MasterProjectService, ReservationService, PaymentPlanService],
})
export class PropertyModule {}
