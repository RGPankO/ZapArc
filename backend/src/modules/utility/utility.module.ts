import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionFilter } from './filters/all-exception.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';

@Global()
@Module({})
export class UtilityModule {
  static forRoot(): DynamicModule {
    return {
      module: UtilityModule,
      providers: [
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

