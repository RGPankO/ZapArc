import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { PrismaService } from '../prisma/prisma.service';

vi.mock('../../config/config', () => ({
  environmentConfig: {
    google: {
      clientId: 'test-google-client-id',
    },
    jwt: {
      refreshSecret: 'test-refresh-secret',
    },
  },
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn(),
  })),
}));

describe('GoogleAuthService', () => {
  let googleAuthService: GoogleAuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    },
  };

  const mockJwtService = {
    sign: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    googleAuthService = module.get<GoogleAuthService>(GoogleAuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('googleLogin', () => {
    const mockGooglePayload = {
      sub: 'google-user-id-123',
      email: 'test@gmail.com',
      name: 'Test User',
      picture: 'https://example.com/picture.jpg',
      given_name: 'Test',
      family_name: 'User',
    };

    const mockExistingUser = {
      id: 'user-id',
      email: 'test@gmail.com',
      nickname: 'Test User',
      googleId: 'google-user-id-123',
      profilePicture: 'https://example.com/picture.jpg',
      isEmailVerified: true,
      isPremium: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should login existing user with Google ID', async () => {
      const mockTicket = {
        getPayload: () => mockGooglePayload,
      };

      // Access the private client and mock verifyIdToken
      const client = (googleAuthService as any).client;
      client.verifyIdToken = vi.fn().mockResolvedValue(mockTicket);

      mockPrismaService.user.findFirst.mockResolvedValue(mockExistingUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await googleAuthService.googleLogin('valid-id-token');

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(mockExistingUser.email);
      expect(result.data.tokens.accessToken).toBe('access-token');
      expect(result.data.tokens.refreshToken).toBe('refresh-token');
    });

    it('should create new user on first Google login', async () => {
      const mockTicket = {
        getPayload: () => mockGooglePayload,
      };

      const client = (googleAuthService as any).client;
      client.verifyIdToken = vi.fn().mockResolvedValue(mockTicket);

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockExistingUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await googleAuthService.googleLogin('valid-id-token');

      expect(result.success).toBe(true);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: mockGooglePayload.email,
          googleId: mockGooglePayload.sub,
          isEmailVerified: true,
          isVerified: true,
        }),
      });
    });

    it('should link Google account to existing email user', async () => {
      const mockTicket = {
        getPayload: () => mockGooglePayload,
      };

      const existingUserWithoutGoogle = {
        ...mockExistingUser,
        googleId: null,
      };

      const client = (googleAuthService as any).client;
      client.verifyIdToken = vi.fn().mockResolvedValue(mockTicket);

      mockPrismaService.user.findFirst.mockResolvedValue(existingUserWithoutGoogle);
      mockPrismaService.user.update.mockResolvedValue(mockExistingUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await googleAuthService.googleLogin('valid-id-token');

      expect(result.success).toBe(true);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: existingUserWithoutGoogle.id },
        data: expect.objectContaining({
          googleId: mockGooglePayload.sub,
        }),
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const client = (googleAuthService as any).client;
      client.verifyIdToken = vi.fn().mockRejectedValue(new Error('Invalid token'));

      await expect(googleAuthService.googleLogin('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when payload is missing', async () => {
      const mockTicket = {
        getPayload: () => undefined,
      };

      const client = (googleAuthService as any).client;
      client.verifyIdToken = vi.fn().mockResolvedValue(mockTicket);

      await expect(googleAuthService.googleLogin('token-without-payload')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should store refresh token in database', async () => {
      const mockTicket = {
        getPayload: () => mockGooglePayload,
      };

      const client = (googleAuthService as any).client;
      client.verifyIdToken = vi.fn().mockResolvedValue(mockTicket);

      mockPrismaService.user.findFirst.mockResolvedValue(mockExistingUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await googleAuthService.googleLogin('valid-id-token');

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: 'refresh-token',
          userId: mockExistingUser.id,
        }),
      });
    });
  });
});
