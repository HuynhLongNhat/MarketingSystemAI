
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, finalize } from "rxjs";
import type { Request, Response } from "express";

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
        const durationMs = Date.now() - startedAt;

        // Exclude query parameters from logs.
        const path = request.path;

        const logEntry = {
          event: "http_request",
          method: request.method,
          path,
          statusCode: response.statusCode,
          durationMs,
          requestId: response.getHeader("x-request-id"),
        };

        const message = JSON.stringify(logEntry);

        if (response.statusCode >= 500) {
          this.logger.error(message);
        } else if (response.statusCode >= 400) {
          this.logger.warn(message);
        } else {
          this.logger.log(message);
        }
      }),
    );
  }
}
