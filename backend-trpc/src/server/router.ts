import { router } from './trpc';
import { userRouter } from '../modules/user';

/**
 * Root Application Router
 *
 * This is the main tRPC router that combines all module routers.
 * Following NestJS-style module organization, each feature has its own module
 * in the src/modules/ directory.
 *
 * Adding a new module:
 * 1. Create your module directory: src/modules/your-module/
 * 2. Add router, schema, and index.ts files
 * 3. Import and register here:
 *    import { yourModuleRouter } from '../modules/your-module';
 *    export const appRouter = router({
 *      user: userRouter,
 *      yourModule: yourModuleRouter, // Add here
 *    });
 *
 * Example usage:
 *   import { appRouter } from './server/router';
 *   const caller = appRouter.createCaller({ ... });
 *   await caller.user.getProfile();
 */
export const appRouter = router({
  user: userRouter,
  // Add more module routers here:
  // auth: authRouter,
  // payment: paymentRouter,
  // product: productRouter,
});

/**
 * Export type definition of the API.
 * Used for type-safe tRPC clients.
 *
 * Usage in frontend:
 *   import type { AppRouter } from '@/server/router';
 *   const trpc = createTRPCClient<AppRouter>({ ... });
 */
export type AppRouter = typeof appRouter;
