import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

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
  private readonly client: OAuth2Client;
  private readonly jwtRefreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.client = new OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
    this.jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET') || 'your-refresh-secret-key';
  }

  async googleLogin(idToken: string) {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.configService.get('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload() as GooglePayload | undefined;

    if (!payload) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const { sub: googleId, email, name, picture, given_name, family_name } = payload;

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            profilePicture: picture || user.profilePicture,
          },
        });
      }
    } else {
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
    }

    const accessToken = this.jwtService.sign({
      userId: user.id,
      email: user.email,
      type: 'access',
    });

    const refreshToken = this.jwtService.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      { secret: this.jwtRefreshSecret, expiresIn: '7d' },
    );

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Google login successful for user: ${user.email}`);

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
  }
}
