import { Catch, ArgumentsHost, HttpStatus, ExceptionFilter } from '@nestjs/common';
import { Response, Request } from 'express';
import { Logger } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/index';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
    let message = exception.message;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2025':
          statusCode = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        case 'P2002':
          statusCode = HttpStatus.CONFLICT;
          message = `Unique constraint violation on: ${(exception.meta?.target as string[])?.join(', ') || 'unknown field'}`;
          break;
        case 'P2003':
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint violation';
          break;
        case 'P2014':
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Required relation violation';
          break;
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
    }

    this.logger.error({
      request: {
        path: request.path,
        method: request.method,
      },
      code: statusCode,
      error: exception,
      message: message,
    });

    response.status(statusCode).json({
      code: statusCode,
      message: message,
      name: exception.name,
    });
  }
}