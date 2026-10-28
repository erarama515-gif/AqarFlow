import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const url = config.get<string>('app.redis.url');
        const prefix = config.get<string>('app.redis.prefix', 'aqarflow:');
        const client = new Redis(url!, {
          keyPrefix: prefix,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        });
        client.on('error', (err) => {
          // eslint-disable-next-line no-console
          console.error('[redis] error', err.message);
        });
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
