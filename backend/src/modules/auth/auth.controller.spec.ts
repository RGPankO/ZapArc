import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;
  let googleAuthService: GoogleAuthService;

  const mockAuthService = {
    register: vi.fn(),
    login: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerificationEmail: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
  };

  const mockGoogleAuthService = {
    googleLogin: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: GoogleAuthService, useValue: mockGoogleAuthService },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    googleAuthService = module.get<GoogleAuthService>(GoogleAuthService);
  });

  describe('register', () => {
    it('should call authService.register with dto', async () => {
      const dto = { email: 'test@example.com', nickname: 'testuser', password: 'Password123' };
      const expectedResult = { success: true, data: { message: 'Registration successful' } };
      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await authController.register(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login with dto', async () => {
      const dto = { email: 'test@example.com', password: 'Password123' };
      const expectedResult = {
        success: true,
        data: {
          user: { id: 'user-id', email: 'test@example.com' },
          tokens: { accessToken: 'access', refreshToken: 'refresh' },
        },
      };
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await authController.login(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('googleLogin', () => {
    it('should call googleAuthService.googleLogin with idToken', async () => {
      const dto = { idToken: 'google-id-token' };
      const expectedResult = {
        success: true,
        data: {
          user: { id: 'user-id', email: 'test@gmail.com' },
          tokens: { accessToken: 'access', refreshToken: 'refresh' },
        },
      };
      mockGoogleAuthService.googleLogin.mockResolvedValue(expectedResult);

      const result = await authController.googleLogin(dto);

      expect(result).toEqual(expectedResult);
      expect(mockGoogleAuthService.googleLogin).toHaveBeenCalledWith(dto.idToken);
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail with dto', async () => {
      const dto = { token: 'verification-token' };
      const expectedResult = { success: true, data: { message: 'Email verified successfully' } };
      mockAuthService.verifyEmail.mockResolvedValue(expectedResult);

      const result = await authController.verifyEmail(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('resendVerification', () => {
    it('should call authService.resendVerificationEmail with email', async () => {
      const dto = { email: 'test@example.com' };
      const expectedResult = { success: true, data: { message: 'Verification email sent' } };
      mockAuthService.resendVerificationEmail.mockResolvedValue(expectedResult);

      const result = await authController.resendVerification(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.resendVerificationEmail).toHaveBeenCalledWith(dto.email);
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken with dto', async () => {
      const dto = { refreshToken: 'refresh-token' };
      const expectedResult = { success: true, data: { accessToken: 'new-access-token' } };
      mockAuthService.refreshToken.mockResolvedValue(expectedResult);

      const result = await authController.refreshToken(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(dto);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with refreshToken', async () => {
      const dto = { refreshToken: 'refresh-token' };
      const expectedResult = { success: true, data: { message: 'Logged out successfully' } };
      mockAuthService.logout.mockResolvedValue(expectedResult);

      const result = await authController.logout(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.logout).toHaveBeenCalledWith(dto.refreshToken);
    });
  });

  describe('getProfile', () => {
    it('should return current user data', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        nickname: 'testuser',
        isVerified: true,
        premiumStatus: 'FREE',
      };

      const result = await authController.getProfile(mockUser);

      expect(result).toEqual({
        success: true,
        data: { user: mockUser },
      });
    });
  });
});
