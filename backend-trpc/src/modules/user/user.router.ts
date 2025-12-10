import { TRPCError } from '@trpc/server';
import { hashPassword, comparePassword } from '../../utils/auth';
import { router, protectedProcedure } from '../../server/trpc';
import {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from './user.schema';

/**
 * User Router
 *
 * Provides protected procedures for user profile management.
 * All procedures require authentication via JWT token.
 */
export const userRouter = router({
  /**
   * Get User Profile
   *
   * Retrieves the authenticated user's profile information.
   * Returns all user fields except sensitive data (passwordHash).
   *
   * @returns User profile object
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        googleId: true,
        isVerified: true,
        isEmailVerified: true,
        premiumStatus: true,
        premiumExpiry: true,
        isPremium: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User profile not found',
      });
    }

    return user;
  }),

  /**
   * Update User Profile
   *
   * Updates the authenticated user's profile information.
   * Allows updating nickname, email, firstName, lastName, and profilePicture.
   *
   * Input validation:
   * - nickname: 2-50 characters
   * - email: valid email format, must be unique
   * - firstName: optional, 1-50 characters
   * - lastName: optional, 1-50 characters
   * - profilePicture: optional, valid URL
   *
   * @returns Updated user profile
   */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const { nickname, email, firstName, lastName, profilePicture } = input;

      // If email is being updated, check if it's already in use
      if (email) {
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email },
        });

        // Check if email is taken by a different user
        if (existingUser && existingUser.id !== ctx.user.userId) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email is already in use by another account',
          });
        }
      }

      // Build update data object with only provided fields
      const updateData: {
        nickname?: string;
        email?: string;
        firstName?: string | null;
        lastName?: string | null;
        profilePicture?: string | null;
      } = {};

      if (nickname !== undefined) updateData.nickname = nickname;
      if (email !== undefined) updateData.email = email;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

      // Update user profile
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.user.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          nickname: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          googleId: true,
          isVerified: true,
          isEmailVerified: true,
          premiumStatus: true,
          premiumExpiry: true,
          isPremium: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    }),

  /**
   * Change Password
   *
   * Changes the authenticated user's password.
   * Requires the current password for verification.
   *
   * Input validation:
   * - currentPassword: required
   * - newPassword: 8-100 characters
   *
   * Business rules:
   * - Current password must be correct
   * - New password cannot be the same as current password
   * - User must have a password (not OAuth-only accounts)
   *
   * @returns Success message
   */
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const { currentPassword, newPassword } = input;

      // Retrieve user with password hash
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.userId },
        select: {
          id: true,
          passwordHash: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Check if user has a password (OAuth users may not have one)
      if (!user.passwordHash) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot change password for OAuth-only accounts. Please set a password first.',
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(
        currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect',
        });
      }

      // Ensure new password is different from current password
      const isSamePassword = await comparePassword(newPassword, user.passwordHash);

      if (isSamePassword) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'New password must be different from current password',
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await ctx.prisma.user.update({
        where: { id: ctx.user.userId },
        data: { passwordHash: newPasswordHash },
      });

      // Optionally: Invalidate all existing sessions/refresh tokens for security
      await ctx.prisma.session.deleteMany({
        where: { userId: ctx.user.userId },
      });

      await ctx.prisma.refreshToken.deleteMany({
        where: { userId: ctx.user.userId },
      });

      return {
        success: true,
        message: 'Password changed successfully. Please log in again.',
      };
    }),

  /**
   * Delete Account
   *
   * Permanently deletes the authenticated user's account.
   * This action is irreversible.
   *
   * Input validation:
   * - password: required for accounts with passwords
   * - confirmation: must be exactly "DELETE" for safety
   *
   * Business rules:
   * - Password must be correct (if account has one)
   * - User must explicitly confirm deletion with "DELETE" string
   * - Cascade deletes all related data (sessions, tokens, payments, etc.)
   *
   * @returns Success message
   */
  deleteAccount: protectedProcedure
    .input(deleteAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const { password, confirmation } = input;

      // Retrieve user with password hash
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.userId },
        select: {
          id: true,
          passwordHash: true,
          email: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Verify password if user has one
      if (user.passwordHash) {
        if (!password) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Password is required to delete account',
          });
        }

        const isPasswordValid = await comparePassword(password, user.passwordHash);

        if (!isPasswordValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Password is incorrect',
          });
        }
      }

      // Verify confirmation string
      if (confirmation !== 'DELETE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Confirmation must be exactly "DELETE"',
        });
      }

      // Delete user account (cascade deletes related data)
      await ctx.prisma.user.delete({
        where: { id: ctx.user.userId },
      });

      return {
        success: true,
        message: 'Account deleted successfully',
      };
    }),
});
