import { Injectable, Logger, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto, VerifyEmailDto, RefreshTokenDto } from './dto/auth.dto';

const SALT_ROUNDS = 12;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtRefreshSecret: string;
  private readonly jwtRefreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET') || 'your-refresh-secret-key';
    this.jwtRefreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  async register(data: RegisterDto) {
    const { email, nickname, password } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        nickname,
        passwordHash,
        verificationToken,
        isVerified: false,
      },
    });

    await this.emailService.sendVerificationEmail(user.email, user.nickname, verificationToken);

    this.logger.log(`User registered successfully: ${user.email}`);

    return {
      success: true,
      data: {
        message: 'Registration successful. Please check your email to verify your account.',
      },
    };
  }

  async login(data: LoginDto) {
    const { email, password } = data;

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in');
    }

    const tokens = this.generateTokenPair(user.id, user.email);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          isVerified: user.isVerified,
          premiumStatus: user.premiumStatus,
        },
        tokens,
      },
    };
  }

  async verifyEmail(data: VerifyEmailDto) {
    const { token } = data;

    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email address is already verified');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    this.logger.log(`Email verified successfully: ${user.email}`);

    return {
      success: true,
      data: {
        message: 'Email verified successfully. You can now log in.',
      },
    };
  }

  async refreshToken(data: RefreshTokenDto) {
    const { refreshToken } = data;

    try {
      this.jwtService.verify(refreshToken, {
        secret: this.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newAccessToken = this.generateAccessToken(session.user.id, session.user.email);

    this.logger.log(`Access token refreshed for user: ${session.user.email}`);

    return {
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({
      where: { token: refreshToken },
    });

    this.logger.log('User logged out successfully');

    return {
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    };
  }

  generateTokenPair(userId: string, email: string): TokenPair {
    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = this.jwtService.sign(
      { userId, email, type: 'refresh' },
      { secret: this.jwtRefreshSecret, expiresIn: this.jwtRefreshExpiresIn },
    );
    return { accessToken, refreshToken };
  }

  private generateAccessToken(userId: string, email: string): string {
    return this.jwtService.sign({ userId, email, type: 'access' });
  }
}
