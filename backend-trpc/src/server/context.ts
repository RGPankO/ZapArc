import { PrismaClient } from '@prisma/client';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { verifyAccessToken } from '../utils/auth';

/**
 * Global Prisma Client instance.
 * Reuses the same instance across the application to avoid connection pooling issues.
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * User information extracted from JWT token.
 */
export interface AuthUser {
  userId: string;
  email: string;
}

/**
 * Creates the context for each tRPC request.
 * Context includes Prisma client and optional authenticated user information.
 *
 * @param opts - Express request and response objects
 * @returns Context object with Prisma client and optional user
 */
export async function createContext({ req, res }: CreateExpressContextOptions) {
  /**
   * Extract and verify JWT token from Authorization header.
   * Expected format: "Bearer <token>"
   */
  async function getUserFromHeader(): Promise<AuthUser | null> {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return null;
    }

    // Validate Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token || token.trim().length === 0) {
      return null;
    }

    try {
      // Verify and decode JWT token
      const decoded = verifyAccessToken(token);

      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      // Token verification failed - return null instead of throwing
      // This allows public procedures to work while protected ones will fail
      return null;
    }
  }

  const user = await getUserFromHeader();

  return {
    prisma,
    user,
    req,
    res,
  };
}

/**
 * Type definition for the context object.
 * This is used throughout the application for type safety.
 */
export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Export Prisma client for use in other parts of the application.
 */
export { prisma };
