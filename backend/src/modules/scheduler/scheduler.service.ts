import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from '../../modules/payments/payments.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  onModuleInit() {
    this.logger.log('Scheduler service initialized');
    this.checkExpiredSubscriptionsJob();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredSubscriptionsJob() {
    this.logger.log('Starting expired subscriptions check job');
    try {
      await this.paymentsService.checkExpiredSubscriptions();
      this.logger.log('Expired subscriptions check job completed');
    } catch (error) {
      this.logger.error('Error in expired subscriptions check job:', error);
    }
  }
}
