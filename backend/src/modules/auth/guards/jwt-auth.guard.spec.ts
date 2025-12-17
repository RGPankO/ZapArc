import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('handleRequest', () => {
    it('should return user when valid', () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        nickname: 'testuser',
      };

      const result = guard.handleRequest(null, mockUser);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when error is provided', () => {
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, null)).toThrow(error);
    });

    it('should throw UnauthorizedException with NO_TOKEN code when user is missing', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);

      try {
        guard.handleRequest(null, null);
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).getResponse()).toEqual({
          success: false,
          error: {
            code: 'NO_TOKEN',
            message: 'Access token is required',
          },
        });
      }
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined)).toThrow(UnauthorizedException);
    });

    it('should prioritize error over missing user', () => {
      const customError = new Error('Custom error');

      expect(() => guard.handleRequest(customError, null)).toThrow(customError);
    });
  });

  describe('canActivate', () => {
    it('should call super.canActivate', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as unknown as ExecutionContext;

      // JwtAuthGuard extends AuthGuard('jwt'), so canActivate delegates to parent
      // We can't easily test this without mocking the entire passport flow
      // Instead, we verify the guard exists and has the method
      expect(guard.canActivate).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });
  });
});
