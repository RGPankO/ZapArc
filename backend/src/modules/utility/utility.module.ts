import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AllExceptionFilter } from './filters/all-exception.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';
import { AppValidationPipe } from './pipes/app-validation.pipe';

@Global()
@Module({})
export class UtilityModule {
  static forRoot(): DynamicModule {
    return {
      module: UtilityModule,
      providers: [
        {
          provide: APP_PIPE,
          useClass: AppValidationPipe,
        },
        /**
         * The order of the filters matters. Filters are executed in reverse order of registration.
         * AllExceptionFilter is registered first (executes last as fallback for all exceptions).
         * HttpExceptionFilter is registered second (executes first to catch HttpException specifically).
         */
        {
          provide: APP_FILTER,
          useClass: AllExceptionFilter,
        },
        {
          provide: APP_FILTER,
          useClass: PrismaExceptionFilter,
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
      ],
    };
  }
}
