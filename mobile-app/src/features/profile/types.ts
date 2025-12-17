import { PremiumStatus } from '../../types';

export interface User {
  id: string;
  email: string;
  nickname: string;
  isVerified: boolean;
  premiumStatus: PremiumStatus;
  premiumExpiry?: Date;
}
