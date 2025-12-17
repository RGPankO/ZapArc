import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PremiumGuard } from './premium.guard';

describe('PremiumGuard', () => {
  let guard: PremiumGuard;

  const createMockContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    guard = new PremiumGuard();
  });

  describe('canActivate', () => {
    it('should return true for premium subscription user', () => {
      const context = createMockContext({
        id: 'user-id',
        premiumStatus: 'PREMIUM_SUBSCRIPTION',
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return true for lifetime premium user', () => {
      const context = createMockContext({
        id: 'user-id',
        premiumStatus: 'PREMIUM_LIFETIME',
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException for free user', () => {
      const context = createMockContext({
        id: 'user-id',
        premiumStatus: 'FREE',
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getResponse()).toEqual({
          success: false,
          error: {
            code: 'PREMIUM_REQUIRED',
            message: 'Premium subscription required',
          },
        });
      }
    });

    it('should throw ForbiddenException when user is not authenticated', () => {
      const context = createMockContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getResponse()).toEqual({
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'Authentication required',
          },
        });
      }
    });

    it('should throw ForbiddenException when user is undefined', () => {
      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
