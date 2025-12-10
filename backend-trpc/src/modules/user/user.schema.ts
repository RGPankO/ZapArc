import { z } from 'zod';

/**
 * User Module Schemas
 *
 * This file contains all Zod validation schemas for user-related operations.
 * Centralizing schemas here makes them reusable and easier to maintain.
 */

/**
 * Update Profile Input Schema
 *
 * Validates input for updating user profile information.
 *
 * Validation rules:
 * - nickname: 2-50 characters
 * - email: valid email format, must be unique
 * - firstName: optional, 1-50 characters
 * - lastName: optional, 1-50 characters
 * - profilePicture: optional, valid URL
 */
export const updateProfileSchema = z.object({
  nickname: z
    .string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(50, 'Nickname must not exceed 50 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .optional(),
  firstName: z
    .string()
    .min(1, 'First name cannot be empty')
    .max(50, 'First name must not exceed 50 characters')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name cannot be empty')
    .max(50, 'Last name must not exceed 50 characters')
    .optional(),
  profilePicture: z
    .string()
    .url('Invalid profile picture URL')
    .optional(),
});

/**
 * Change Password Input Schema
 *
 * Validates input for changing user password.
 *
 * Validation rules:
 * - currentPassword: required
 * - newPassword: 8-100 characters
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100, 'New password must not exceed 100 characters'),
});

/**
 * Delete Account Input Schema
 *
 * Validates input for account deletion.
 *
 * Validation rules:
 * - password: optional, required for accounts with passwords
 * - confirmation: must be exactly "DELETE" for safety
 */
export const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmation: z
    .string()
    .refine((val) => val === 'DELETE', {
      message: 'Confirmation must be exactly "DELETE"',
    }),
});

/**
 * Type exports for use in router and services
 */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
