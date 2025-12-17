import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

vi.mock('bcrypt');
vi.mock('crypto');
vi.mock('../../config/config', () => ({
  environmentConfig: {
    jwt: {
      refreshSecret: 'test-refresh-secret',
      refreshExpiresIn: '7d',
    },
  },
}));

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let emailService: EmailService;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  const mockJwtService = {
    sign: vi.fn(),
    verify: vi.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      nickname: 'testuser',
      password: 'Password123',
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        nickname: 'testuser',
        verificationToken: 'mock-token',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => 'mock-verification-token',
      } as never);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await authService.register(registerDto);

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('Registration successful');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should lowercase the email before storing', async () => {
      const upperCaseEmail = { ...registerDto, email: 'TEST@EXAMPLE.COM' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => 'mock-token',
      } as never);
      mockPrismaService.user.create.mockResolvedValue({ id: 'user-id', email: 'test@example.com' });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      await authService.register(upperCaseEmail);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      nickname: 'testuser',
      passwordHash: 'hashed-password',
      isVerified: true,
      premiumStatus: 'FREE',
    };

    it('should login successfully with valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.session.create.mockResolvedValue({});

      const result = await authService.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(mockUser.email);
      expect(result.data.tokens).toBeDefined();
      expect(mockPrismaService.session.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unverified user', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      mockPrismaService.user.findUnique.mockResolvedValue(unverifiedUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        isVerified: false,
        verificationToken: 'valid-token',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({ ...mockUser, isVerified: true });

      const result = await authService.verifyEmail({ token: 'valid-token' });

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('Email verified successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { isVerified: true, verificationToken: null },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(authService.verifyEmail({ token: 'invalid-token' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already verified', async () => {
      const verifiedUser = {
        id: 'user-id',
        email: 'test@example.com',
        isVerified: true,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(verifiedUser);

      await expect(authService.verifyEmail({ token: 'token' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockSession = {
        id: 'session-id',
        token: 'valid-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-id', email: 'test@example.com' },
      };

      mockJwtService.verify.mockReturnValue({ userId: 'user-id' });
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await authService.refreshToken({ refreshToken: 'valid-refresh-token' });

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken({ refreshToken: 'invalid-token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired session', async () => {
      const expiredSession = {
        id: 'session-id',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 86400000),
        user: { id: 'user-id', email: 'test@example.com' },
      };

      mockJwtService.verify.mockReturnValue({ userId: 'user-id' });
      mockPrismaService.session.findUnique.mockResolvedValue(expiredSession);
      mockPrismaService.session.delete.mockResolvedValue({});

      await expect(authService.refreshToken({ refreshToken: 'expired-token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent session', async () => {
      mockJwtService.verify.mockReturnValue({ userId: 'user-id' });
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(authService.refreshToken({ refreshToken: 'unknown-token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 1 });

      const result = await authService.logout('refresh-token');

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('Logged out successfully');
      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: { token: 'refresh-token' },
      });
    });

    it('should succeed even if session does not exist', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 0 });

      const result = await authService.logout('nonexistent-token');

      expect(result.success).toBe(true);
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        nickname: 'testuser',
        isVerified: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => 'new-verification-token',
      } as never);
      mockPrismaService.user.update.mockResolvedValue({});
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await authService.resendVerificationEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should return success even if user does not exist (prevent enumeration)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await authService.resendVerificationEmail('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(mockEmailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email is already verified', async () => {
      const verifiedUser = {
        id: 'user-id',
        email: 'test@example.com',
        isVerified: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(verifiedUser);

      await expect(authService.resendVerificationEmail('test@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', () => {
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = authService.generateTokenPair('user-id', 'test@example.com');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });
  });
});
