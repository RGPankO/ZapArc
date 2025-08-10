import { PrismaClient } from '../generated/prisma';
import { 
  hashPassword, 
  verifyPassword, 
  generateTokenPair, 
  generateVerificationToken, 
  validatePassword, 
  validateEmail,
  verifyToken
} from '../utils/auth';
import type { TokenPair } from '../utils/auth';
import { emailService } from './emailService';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../types';

const prisma = new PrismaClient();

export interface RegisterRequest {
  email: string;
  nickname: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    nickname: string;
    isVerified: boolean;
    premiumStatus: string;
  };
  tokens: TokenPair;
}

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      const { email, nickname, password } = data;

      // Validate input
      if (!email || !nickname || !password) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email, nickname, and password are required'
          }
        };
      }

      // Validate email format
      if (!validateEmail(email)) {
        return {
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Please provide a valid email address'
          }
        };
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password does not meet requirements',
            details: passwordValidation.errors
          }
        };
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'A user with this email already exists'
          }
        };
      }

      // Hash password and generate verification token
      const passwordHash = await hashPassword(password);
      const verificationToken = generateVerificationToken();

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          nickname,
          passwordHash,
          verificationToken,
          isVerified: false
        }
      });

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(
        user.email,
        user.nickname,
        verificationToken
      );

      if (!emailSent) {
        logger.warn(`Failed to send verification email to ${user.email}`);
      }

      logger.info(`User registered successfully: ${user.email}`);

      return {
        success: true,
        data: {
          message: 'Registration successful. Please check your email to verify your account.'
        }
      };

    } catch (error) {
      logger.error('Registration error:', error);
      return {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Registration failed. Please try again.'
        }
      };
    }
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const { email, password } = data;
      logger.info(`Login attempt for email: ${email}`);

      // Validate input
      if (!email || !password) {
        logger.warn('Login failed: Missing email or password');
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          }
        };
      }
      console.log('$$Finding user...');
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        logger.warn(`Login failed: User not found for email: ${email}`);
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        };
      }
      console.log('$$user found');
      logger.info(`User found: ${user.email}, isVerified: ${user.isVerified}`);

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      logger.info(`Password verification result: ${isPasswordValid}`);
      console.log('$$password verified')
      if (!isPasswordValid) {
        logger.warn(`Login failed: Invalid password for email: ${email}`);
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        };
      }
      console.log('$$password verified 2')

      // Check if email is verified
      if (!user.isVerified) {
        logger.warn(`Login failed: Email not verified for: ${email}`);
        return {
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email address before logging in'
          }
        };
      }
      console.log('$$email verified')
      // Generate tokens
      const tokens = generateTokenPair(user.id, user.email);
      console.log('$$tokens created')
      // Store refresh token in database
      await prisma.session.create({
        data: {
          userId: user.id,
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });
      console.log('$$tokens stored')
      logger.info(`User logged in successfully: ${user.email}`);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            isVerified: user.isVerified,
            premiumStatus: user.premiumStatus
          },
          tokens
        }
      };

    } catch (error) {
      logger.error('Login error:', error);
      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login failed. Please try again.'
        }
      };
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(data: VerifyEmailRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      const { token } = data;

      if (!token) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Verification token is required'
          }
        };
      }

      // Find user with verification token
      const user = await prisma.user.findFirst({
        where: { verificationToken: token }
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired verification token'
          }
        };
      }

      if (user.isVerified) {
        return {
          success: false,
          error: {
            code: 'ALREADY_VERIFIED',
            message: 'Email address is already verified'
          }
        };
      }

      // Update user as verified
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verificationToken: null
        }
      });

      logger.info(`Email verified successfully: ${user.email}`);

      return {
        success: true,
        data: {
          message: 'Email verified successfully. You can now log in.'
        }
      };

    } catch (error) {
      logger.error('Email verification error:', error);
      return {
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Email verification failed. Please try again.'
        }
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<ApiResponse<{ accessToken: string }>> {
    try {
      const { refreshToken } = data;

      if (!refreshToken) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required'
          }
        };
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = verifyToken(refreshToken, 'refresh');
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token'
          }
        };
      }

      // Check if refresh token exists in database
      const session = await prisma.session.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });

      if (!session || session.expiresAt < new Date()) {
        // Clean up expired session
        if (session) {
          await prisma.session.delete({
            where: { id: session.id }
          });
        }

        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired refresh token'
          }
        };
      }

      // Generate new access token
      const newAccessToken = generateTokenPair(session.user.id, session.user.email).accessToken;

      logger.info(`Access token refreshed for user: ${session.user.email}`);

      return {
        success: true,
        data: {
          accessToken: newAccessToken
        }
      };

    } catch (error) {
      logger.error('Token refresh error:', error);
      return {
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Token refresh failed. Please log in again.'
        }
      };
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(refreshToken: string): Promise<ApiResponse<{ message: string }>> {
    try {
      if (!refreshToken) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required'
          }
        };
      }

      // Delete session from database
      await prisma.session.deleteMany({
        where: { token: refreshToken }
      });

      logger.info('User logged out successfully');

      return {
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      };

    } catch (error) {
      logger.error('Logout error:', error);
      return {
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout failed. Please try again.'
        }
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired sessions`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
    }
  }
}

export const authService = new AuthService();