import { Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto, ChangePasswordDto } from './dto/user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        isVerified: true,
        premiumStatus: true,
        premiumExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      };
    }

    return {
      success: true,
      data: { user },
    };
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const { nickname, email } = data;

    if (!nickname && !email) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one field (nickname or email) must be provided',
        },
      };
    }

    if (email && !this.validateEmail(email)) {
      return {
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address',
        },
      };
    }

    if (email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return {
          success: false,
          error: {
            code: 'EMAIL_TAKEN',
            message: 'This email address is already in use',
          },
        };
      }
    }

    const updateData: Record<string, unknown> = {};
    if (nickname) updateData.nickname = nickname;
    if (email) {
      updateData.email = email.toLowerCase();
      updateData.isVerified = false;
      updateData.verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nickname: true,
        isVerified: true,
        premiumStatus: true,
        premiumExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`User profile updated: ${updatedUser.email}`);

    return {
      success: true,
      data: { user: updatedUser },
    };
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    const { currentPassword, newPassword } = data;

    if (!currentPassword || !newPassword) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current password and new password are required',
        },
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      };
    }

    if (!user.passwordHash) {
      return {
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect',
        },
      };
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return {
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect',
        },
      };
    }

    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'New password does not meet requirements',
          details: passwordValidation.errors,
        },
      };
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return {
        success: false,
        error: {
          code: 'SAME_PASSWORD',
          message: 'New password must be different from current password',
        },
      };
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.prisma.session.deleteMany({ where: { userId } });

    this.logger.log(`Password changed for user: ${user.email}`);

    return {
      success: true,
      data: {
        message: 'Password changed successfully. Please log in again.',
      },
    };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId } });
      await tx.payment.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    this.logger.log(`User account deleted: ${user.email}`);

    return {
      success: true,
      data: {
        message: 'Account deleted successfully',
      },
    };
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return { isValid: errors.length === 0, errors };
  }
}
