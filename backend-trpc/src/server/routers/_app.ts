import { router } from '../trpc';
import { userRouter } from './user';

/**
 * Root Application Router
 *
 * This is the main tRPC router that combines all sub-routers.
 * New routers should be added here as the application grows.
 *
 * Example usage:
 *   import { appRouter } from './server/routers/_app';
 *   const trpc = trpc.createCaller({ ... });
 *   await trpc.user.getProfile();
 */
export const appRouter = router({
  user: userRouter,
  // Add more routers here as needed:
  // auth: authRouter,
  // payment: paymentRouter,
  // etc.
});

/**
 * Export type definition of the API.
 * Used for type-safe tRPC clients.
 */
export type AppRouter = typeof appRouter;
