import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { environmentConfig } from '../../config/config';

interface GooglePayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly client = new OAuth2Client(environmentConfig.google.clientId);
  private readonly jwtRefreshSecret = environmentConfig.jwt.refreshSecret;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
  }

  async googleLogin(idToken: string) {
    this.logger.log('🔵 googleLogin method called');
    this.logger.log(`Token preview: ${idToken.substring(0, 30)}...`);

    try {
      this.logger.log('🔵 Verifying ID token with Google...');
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: environmentConfig.google.clientId,
      });
      this.logger.log('✅ Token verified successfully');

      const payload = ticket.getPayload() as GooglePayload | undefined;

      if (!payload) {
        this.logger.error('❌ No payload in verified token');
        throw new UnauthorizedException('Invalid Google ID token');
      }

      const { sub: googleId, email, name, picture, given_name, family_name } = payload;
      this.logger.log(`🔵 Extracted user data - Email: ${email}, GoogleID: ${googleId}`);

      this.logger.log('🔵 Looking up user in database...');
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ googleId }, { email }],
        },
      });

      if (user) {
        this.logger.log(`✅ Found existing user: ${user.email} (ID: ${user.id})`);
        if (!user.googleId) {
          this.logger.log('🔵 Updating user with Google ID...');
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              googleId,
              profilePicture: picture || user.profilePicture,
            },
          });
          this.logger.log('✅ User updated with Google ID');
        }
      } else {
        this.logger.log('🔵 No existing user found, creating new user...');
        user = await this.prisma.user.create({
          data: {
            email,
            nickname: name || `${given_name} ${family_name}`.trim(),
            googleId,
            profilePicture: picture,
            isEmailVerified: true,
            isVerified: true,
            firstName: given_name,
            lastName: family_name,
          },
        });
        this.logger.log(`✅ New user created: ${user.email} (ID: ${user.id})`);
      }

      this.logger.log('🔵 Generating JWT tokens...');
      const accessToken = this.jwtService.sign({
        userId: user.id,
        email: user.email,
        type: 'access',
      });

      const refreshToken = this.jwtService.sign(
        { userId: user.id, email: user.email, type: 'refresh' },
        { secret: this.jwtRefreshSecret, expiresIn: '7d' },
      );
      this.logger.log('✅ JWT tokens generated');

      this.logger.log('🔵 Saving refresh token to database...');
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      this.logger.log('✅ Refresh token saved');

      this.logger.log(`✅✅✅ Google login successful for user: ${user.email}`);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            profilePicture: user.profilePicture,
            isEmailVerified: user.isEmailVerified,
            isPremium: user.isPremium,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      };
    } catch (error) {
      this.logger.error('❌❌❌ Google login failed with error:');
      this.logger.error(error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Google authentication failed: ' + error);
    }
  }
}
