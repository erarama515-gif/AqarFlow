import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Lightweight request logger. For production we'd swap to pino-http on the
 * Express adapter, but this gives a single place to add request metrics and
 * correlation IDs without depending on a 3rd-party logger choice yet.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const startedAt = process.hrtime.bigint();
    const { method, originalUrl } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
          const status = http.getResponse().statusCode;
          this.logger.log(`${method} ${originalUrl} → ${status} (${ms.toFixed(1)}ms)`);
        },
        error: (err: Error) => {
          const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
          this.logger.warn(`${method} ${originalUrl} → error (${ms.toFixed(1)}ms): ${err.message}`);
        },
      }),
    );
  }
}
