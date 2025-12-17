export interface PaymentPlan {
  id: string;
  type: 'subscription' | 'one-time';
  price: number;
  currency: string;
  duration?: string;
  features: string[];
}
