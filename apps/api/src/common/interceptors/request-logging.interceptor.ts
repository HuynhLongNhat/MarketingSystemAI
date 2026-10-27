
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, finalize } from 'rxjs';
import type { Request, Response } from 'express';

@Injectable()
export class RequestLoggingInterceptor
  implements NestInterceptor
{
  private readonly logger = new Logger(
    RequestLoggingInterceptor.name,
  );

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request>();

    const response = context
      .switchToHttp()
      .getResponse<Response>();

    const startedAt = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const duration = Date.now() - startedAt;

        this.logger.log(
          JSON.stringify({
            method: request.method,
            path: request.originalUrl,
            statusCode: response.statusCode,
            durationMs: duration,
            requestId: response.getHeader('x-request-id'),
          }),
        );
      }),
    );
  }
}
