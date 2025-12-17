import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

vi.mock('../../../config/config', () => ({
  environmentConfig: {
    jwt: {
      secret: 'test-jwt-secret',
    },
  },
}));

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('validate', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      nickname: 'testuser',
      isVerified: true,
      premiumStatus: 'FREE',
    };

    it('should return user data for valid access token payload', async () => {
      const payload = { userId: 'user-id', email: 'test@example.com', type: 'access' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await jwtStrategy.validate(payload);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        nickname: mockUser.nickname,
        isVerified: mockUser.isVerified,
        premiumStatus: mockUser.premiumStatus,
      });
    });

    it('should throw UnauthorizedException for non-access token type', async () => {
      const payload = { userId: 'user-id', email: 'test@example.com', type: 'refresh' };

      await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(jwtStrategy.validate(payload)).rejects.toThrow('Invalid token type');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = { userId: 'non-existent-user', email: 'test@example.com', type: 'access' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(jwtStrategy.validate(payload)).rejects.toThrow('User not found');
    });

    it('should query user by userId from payload', async () => {
      const payload = { userId: 'specific-user-id', email: 'test@example.com', type: 'access' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await jwtStrategy.validate(payload);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'specific-user-id' },
      });
    });
  });
});
