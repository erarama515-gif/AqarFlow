import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TenantContextModule } from '../../shared/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';

import { BookingService } from './application/booking.service';
import { BookingExpiryJob } from './application/booking-expiry.job';
import { BookingController } from './presentation/booking.controller';

@Module({
  imports: [IamModule, TenantContextModule, AuditModule],
  providers: [BookingService, BookingExpiryJob],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
