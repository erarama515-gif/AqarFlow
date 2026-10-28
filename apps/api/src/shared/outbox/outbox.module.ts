import { Global, Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { OutboxPublisher } from './outbox.publisher';

@Global()
@Module({
  providers: [OutboxService, OutboxPublisher],
  exports: [OutboxService, OutboxPublisher],
})
export class OutboxModule {}
