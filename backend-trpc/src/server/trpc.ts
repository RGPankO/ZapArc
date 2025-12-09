import { TRPCError, initTRPC } from '@trpc/server';
import type { Context } from './context';

/**
 * Initialize tRPC with typed context.
 * This creates the base builder for all procedures and routers.
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * Export reusable router and procedure builders.
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure middleware.
 * Ensures that the user is authenticated before allowing access to the procedure.
 *
 * Usage:
 *   protectedProcedure.query(async ({ ctx }) => {
 *     // ctx.user is guaranteed to exist here
 *     return ctx.user;
 *   });
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // Check if user exists in context
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please provide a valid access token.',
    });
  }

  // Verify user still exists in database
  const userExists = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.userId },
  });

  if (!userExists) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User account not found. Token may be invalid.',
    });
  }

  // Continue with authenticated context
  return next({
    ctx: {
      ...ctx,
      // Override user to be non-nullable for type safety
      user: ctx.user,
    },
  });
});

/**
 * Middleware for logging requests (optional).
 * Can be used for debugging or monitoring.
 */
export const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[tRPC] ${type} ${path} - ${durationMs}ms`);
  }

  return result;
});
