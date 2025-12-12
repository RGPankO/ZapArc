import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    this.logger.error({
      request: {
        path: request.path,
        method: request.method,
      },
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: exception.message,
      stack: exception.stack,
    });

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      },
    });
  }
}
