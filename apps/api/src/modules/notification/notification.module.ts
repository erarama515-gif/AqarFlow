import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { TenantContextModule } from '../../shared/tenant/tenant.module';

import { NotificationService } from './application/notification.service';
import { EmailTransport } from './infrastructure/email.transport';
import { NotificationGateway } from './infrastructure/notification.gateway';
import { NotificationController } from './presentation/notification.controller';

@Module({
  imports: [IamModule, TenantContextModule],
  providers: [NotificationService, EmailTransport, NotificationGateway],
  controllers: [NotificationController],
  exports: [NotificationService, EmailTransport],
})
export class NotificationModule {}
