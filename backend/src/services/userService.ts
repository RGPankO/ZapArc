import { PrismaClient } from '../generated/prisma';
import { 
  hashPassword, 
  verifyPassword, 
  validatePassword, 
  validateEmail
} from '../utils/auth';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../types';

const prisma = new PrismaClient();

export interface UpdateProfileRequest {
  nickname?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  isVerified: boolean;
  premiumStatus: string;
  premiumExpiry?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

class UserService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<ApiResponse<{ user: UserProfile }>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          nickname: true,
          isVerified: true,
          premiumStatus: true,
          premiumExpiry: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      return {
        success: true,
        data: {
          user
        }
      };

    } catch (error) {
      logger.error('Get profile error:', error);
      return {
        success: false,
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile'
        }
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<ApiResponse<{ user: UserProfile }>> {
    try {
      const { nickname, email } = data;

      // Validate input
      if (!nickname && !email) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one field (nickname or email) must be provided'
          }
        };
      }

      // Validate email format if provided
      if (email && !validateEmail(email)) {
        return {
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Please provide a valid email address'
          }
        };
      }

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: email.toLowerCase(),
            NOT: { id: userId }
          }
        });

        if (existingUser) {
          return {
            success: false,
            error: {
              code: 'EMAIL_TAKEN',
              message: 'This email address is already in use'
            }
          };
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (nickname) updateData.nickname = nickname;
      if (email) {
        updateData.email = email.toLowerCase();
        // If email is changed, mark as unverified and generate new verification token
        updateData.isVerified = false;
        updateData.verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }

      // Update user
      const updatedUser = await prisma.user.update({
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
          updatedAt: true
        }
      });

      logger.info(`User profile updated: ${updatedUser.email}`);

      return {
        success: true,
        data: {
          user: updatedUser
        }
      };

    } catch (error) {
      logger.error('Update profile error:', error);
      return {
        success: false,
        error: {
          code: 'PROFILE_UPDATE_FAILED',
          message: 'Failed to update user profile'
        }
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, data: ChangePasswordRequest): Promise<ApiResponse<{ message: string }>> {
    try {
      const { currentPassword, newPassword } = data;

      // Validate input
      if (!currentPassword || !newPassword) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current password and new password are required'
          }
        };
      }

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true
        }
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'Current password is incorrect'
          }
        };
      }

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'New password does not meet requirements',
            details: passwordValidation.errors
          }
        };
      }

      // Check if new password is different from current
      const isSamePassword = await verifyPassword(newPassword, user.passwordHash);
      if (isSamePassword) {
        return {
          success: false,
          error: {
            code: 'SAME_PASSWORD',
            message: 'New password must be different from current password'
          }
        };
      }

      // Hash new password and update
      const newPasswordHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      // Invalidate all existing sessions for security
      await prisma.session.deleteMany({
        where: { userId }
      });

      logger.info(`Password changed for user: ${user.email}`);

      return {
        success: true,
        data: {
          message: 'Password changed successfully. Please log in again.'
        }
      };

    } catch (error) {
      logger.error('Change password error:', error);
      return {
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_FAILED',
          message: 'Failed to change password'
        }
      };
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      // Get user to log the deletion
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });

      if (!user) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        };
      }

      // Delete user and all related data (cascade delete)
      await prisma.$transaction(async (tx) => {
        // Delete sessions
        await tx.session.deleteMany({
          where: { userId }
        });

        // Delete payments
        await tx.payment.deleteMany({
          where: { userId }
        });

        // Delete user
        await tx.user.delete({
          where: { id: userId }
        });
      });

      logger.info(`User account deleted: ${user.email}`);

      return {
        success: true,
        data: {
          message: 'Account deleted successfully'
        }
      };

    } catch (error) {
      logger.error('Delete account error:', error);
      return {
        success: false,
        error: {
          code: 'ACCOUNT_DELETE_FAILED',
          message: 'Failed to delete account'
        }
      };
    }
  }
}

export const userService = new UserService();