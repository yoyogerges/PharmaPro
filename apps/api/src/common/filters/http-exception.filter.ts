import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { AbstractHttpAdapter } from '@nestjs/core';
import type { ErrorResponse } from '@pharmapro/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapter: AbstractHttpAdapter) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ url: string; method: string }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as { message?: string | string[]; error?: string; details?: unknown };
        message = obj.message ?? exception.message;
        details = obj.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${exception instanceof Error ? exception.stack : String(exception)}`,
      );
    }

    const responseBody: ErrorResponse = {
      success: false,
      statusCode: status,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: this.httpAdapter.getRequestUrl(request),
    };

    this.httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }
}