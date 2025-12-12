import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdsModule } from './modules/ads/ads.module';
import { EmailModule } from './modules/email/email.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { UtilityModule } from './modules/utility/utility.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UtilityModule.forRoot(),
    PrismaModule,
    AuthModule,
    UserModule,
    PaymentsModule,
    AdsModule,
    EmailModule,
    SchedulerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
