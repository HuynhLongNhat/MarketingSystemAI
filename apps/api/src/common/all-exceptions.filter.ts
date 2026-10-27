
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

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

    // Extract error message
    const rawMessage =
      typeof errorResponse === "string"
        ? errorResponse
        : errorResponse &&
            typeof errorResponse === "object" &&
            "message" in errorResponse
          ? errorResponse.message
          : isHttpException
            ? exception.message
            : "Internal server error";

    // Prevent internal server error details from leaking
    const message =
      statusCode >= 500
        ? "Internal server error"
        : rawMessage;

    // Extract error code
    const code =
      errorResponse &&
      typeof errorResponse === "object" &&
      "code" in errorResponse &&
      typeof errorResponse.code === "string"
        ? errorResponse.code
        : statusCode >= 500
          ? "INTERNAL_SERVER_ERROR"
          : "HTTP_ERROR";

    // Extract validation details
    const details =
      statusCode < 500 &&
      errorResponse &&
      typeof errorResponse === "object" &&
      "details" in errorResponse
        ? errorResponse.details
        : undefined;

    const requestId = response.getHeader("x-request-id");

    // Log internal server errors
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.path}`,
        exception instanceof Error
          ? exception.stack
          : String(exception),
      );
    }

    // Standard API error response
    response.status(statusCode).json({
      success: false,
      error: {
        statusCode,
        code: statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      requestId,
      timestamp: new Date().toISOString(),
      path: request.path,
    });
  }
}
