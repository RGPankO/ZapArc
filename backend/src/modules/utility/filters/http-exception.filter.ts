import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const statusCode = exception.getStatus();

    this.logger.error({
      request: {
        path: request.path,
        method: request.method,
      },
      code: statusCode,
      error: exception,
      message: exception.message,
    });

    response.status(statusCode).json({
      code: statusCode,
      message: exception.message,
      name: exception.constructor.name,
    });
  }
}

