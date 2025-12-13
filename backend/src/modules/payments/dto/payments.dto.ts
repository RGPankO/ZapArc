import { IsEnum, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { PaymentType, PaymentStatus } from '../../../../generated/prisma';

export class CreatePaymentDto {
  @IsEnum(PaymentType)
  type: PaymentType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  platformId?: string;
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsString()
  platformId?: string;
}

export class PaymentWebhookDto {
  @IsString()
  paymentId: string;

  @IsString()
  platformId: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  userId: string;

  @IsEnum(PaymentType)
  type: PaymentType;
}
