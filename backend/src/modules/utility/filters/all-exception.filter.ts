import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Log error details using NestJS Logger
    this.logger.error({
      request: {
        path: request.path,
        method: request.method,
      },
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      error: exception,
      message: exception.message,
      stack: exception.stack,
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: exception?.message || 'Internal server error',
      name: exception?.constructor?.name || 'Error',
    });
  }
}

