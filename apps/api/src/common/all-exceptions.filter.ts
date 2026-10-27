
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(
    AllExceptionsFilter.name,
  );

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = isHttpException
      ? exception.getResponse()
      : null;

    const message =
      typeof errorResponse === 'string'
        ? errorResponse
        : errorResponse &&
            typeof errorResponse === 'object' &&
            'message' in errorResponse
          ? errorResponse.message
          : isHttpException
            ? exception.message
            : 'Internal server error';

    const requestId = response.getHeader('x-request-id');

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl}`,
        exception instanceof Error
          ? exception.stack
          : String(exception),
      );
    }

    response.status(statusCode).json({
      success: false,
      error: {
        statusCode,
        message,
      },
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
