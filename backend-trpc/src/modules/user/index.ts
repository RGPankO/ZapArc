/**
 * User Module
 *
 * This module exports all user-related functionality including:
 * - Router: tRPC procedures for user operations
 * - Schemas: Zod validation schemas for input/output
 *
 * Usage:
 *   import { userRouter } from './modules/user';
 *   // or
 *   import { updateProfileSchema } from './modules/user';
 */

export { userRouter } from './user.router';
export {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type DeleteAccountInput,
} from './user.schema';
