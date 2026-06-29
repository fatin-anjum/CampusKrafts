import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Converts any thrown error into the standard error envelope documented in
 * docs/04-API.md:  { error: { code, message, details, traceId } }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const traceId = randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        code = body.code || mapStatusToCode(status);
        message = Array.isArray(body.message) ? body.message[0] : body.message || message;
        details = body.details || (Array.isArray(body.message) ? body.message : undefined);
      }
      if (code === 'INTERNAL_ERROR') code = mapStatusToCode(status);
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(`[${traceId}] ${req.method} ${req.url} → ${message}`, (exception as Error)?.stack);
    }

    res.status(status).json({ error: { code, message, details, traceId } });
  }
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case 400: return 'VALIDATION_ERROR';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'UNPROCESSABLE';
    case 429: return 'RATE_LIMITED';
    default: return 'INTERNAL_ERROR';
  }
}
