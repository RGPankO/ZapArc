export class CreatePaymentDto {
  type: 'SUBSCRIPTION' | 'ONE_TIME';
  amount: number;
  currency: string;
  platformId?: string;
}

export class UpdatePaymentStatusDto {
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  platformId?: string;
}

export class PaymentWebhookDto {
  paymentId: string;
  platformId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency: string;
  userId: string;
  type: 'SUBSCRIPTION' | 'ONE_TIME';
}
