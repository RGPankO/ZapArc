import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { VerifiedEmailGuard } from './verified-email.guard';

describe('VerifiedEmailGuard', () => {
  let guard: VerifiedEmailGuard;

  const createMockContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    guard = new VerifiedEmailGuard();
  });

  describe('canActivate', () => {
    it('should return true for verified user', () => {
      const context = createMockContext({
        id: 'user-id',
        email: 'test@example.com',
        isVerified: true,
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException for unverified user', () => {
      const context = createMockContext({
        id: 'user-id',
        email: 'test@example.com',
        isVerified: false,
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getResponse()).toEqual({
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Email verification required',
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

    it('should throw ForbiddenException when isVerified is missing', () => {
      const context = createMockContext({
        id: 'user-id',
        email: 'test@example.com',
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
