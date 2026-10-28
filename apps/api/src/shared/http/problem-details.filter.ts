import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Maps every uncaught error to an RFC 7807 Problem Details JSON response.
 * Keeps API consumers happy with a stable error shape regardless of the
 * actual exception source (Nest, Prisma, validation, or unexpected).
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail: string | undefined;
    let type = 'https://docs.aqarflow.io/errors/internal';
    let errors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        detail = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        title = (r.error as string) ?? exception.name;
        detail = (r.message as string) ?? exception.message;
        if (Array.isArray(r.message)) {
          errors = r.message;
          detail = 'Validation failed';
        }
      }
      type = `https://docs.aqarflow.io/errors/${exception.name.toLowerCase()}`;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Map common Prisma errors to HTTP status codes
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          title = 'Resource Conflict';
          detail = `Unique constraint violation on: ${JSON.stringify(exception.meta?.target)}`;
          type = 'https://docs.aqarflow.io/errors/conflict';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          title = 'Resource Not Found';
          detail = exception.meta?.cause as string;
          type = 'https://docs.aqarflow.io/errors/not-found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          title = 'Foreign Key Constraint Failed';
          detail = (exception.meta?.field_name as string) ?? exception.message;
          type = 'https://docs.aqarflow.io/errors/bad-request';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          title = 'Database Error';
          detail = exception.message;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
      this.logger.error(exception.stack);
    }

    const traceId = response.getHeader('X-Request-Id')?.toString();
    response.status(status).json({
      type,
      title,
      status,
      detail,
      instance: request.url,
      errors,
      traceId,
    });
  }
}
