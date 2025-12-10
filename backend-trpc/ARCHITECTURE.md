# Backend-tRPC Architecture

## Overview

This backend follows a **NestJS-style module organization** for tRPC, providing a clean, scalable structure where each feature is organized into its own module.

## Directory Structure

```
backend-trpc/src/
├── modules/                    # Feature modules (domain-driven)
│   └── user/                   # User feature module
│       ├── user.router.ts      # tRPC router procedures
│       ├── user.schema.ts      # Zod input/output schemas
│       ├── user.service.ts     # Business logic (optional)
│       └── index.ts            # Module exports
├── server/                     # Server configuration
│   ├── trpc.ts                 # tRPC initialization & middleware
│   ├── context.ts              # Request context creation
│   └── router.ts               # Main app router (combines all modules)
├── utils/                      # Shared utilities
│   └── auth.ts                 # Authentication helpers
└── index.ts                    # Express server entry point
```

## Module Organization

### What is a Module?

A module is a self-contained feature that includes:

1. **Router** (`*.router.ts`): tRPC procedures (queries/mutations)
2. **Schemas** (`*.schema.ts`): Zod validation schemas for inputs/outputs
3. **Service** (`*.service.ts`): Business logic (optional, for complex operations)
4. **Index** (`index.ts`): Exports all public APIs from the module

### Module Template

When creating a new module (e.g., `payment`), follow this structure:

```
src/modules/payment/
├── payment.router.ts       # tRPC procedures
├── payment.schema.ts       # Zod schemas
├── payment.service.ts      # Business logic (optional)
└── index.ts                # Exports
```

## Adding a New Module

### Step 1: Create Module Directory

```bash
mkdir src/modules/your-module
```

### Step 2: Create Schema File

**`src/modules/your-module/your-module.schema.ts`**

```typescript
import { z } from 'zod';

/**
 * Input schema for creating a resource
 */
export const createResourceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

/**
 * Type exports
 */
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
```

### Step 3: Create Router File

**`src/modules/your-module/your-module.router.ts`**

```typescript
import { router, protectedProcedure, publicProcedure } from '../../server/trpc';
import { createResourceSchema } from './your-module.schema';

/**
 * Your Module Router
 *
 * Provides procedures for [feature description].
 */
export const yourModuleRouter = router({
  /**
   * Get all resources
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.resource.findMany();
  }),

  /**
   * Create a new resource
   */
  create: protectedProcedure
    .input(createResourceSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.resource.create({
        data: input,
      });
    }),
});
```

### Step 4: Create Index File

**`src/modules/your-module/index.ts`**

```typescript
export { yourModuleRouter } from './your-module.router';
export { createResourceSchema, type CreateResourceInput } from './your-module.schema';
```

### Step 5: Register Module in Main Router

**`src/server/router.ts`**

```typescript
import { router } from './trpc';
import { userRouter } from '../modules/user';
import { yourModuleRouter } from '../modules/your-module'; // Add import

export const appRouter = router({
  user: userRouter,
  yourModule: yourModuleRouter, // Register module
});

export type AppRouter = typeof appRouter;
```

That's it! Your module is now integrated.

## Service Layer (Optional)

For complex business logic, create a service file:

**`src/modules/your-module/your-module.service.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

/**
 * Service class for complex business logic
 */
export class YourModuleService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Complex operation with multiple steps
   */
  async performComplexOperation(userId: string) {
    // Multi-step business logic
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // ... more complex logic

    return result;
  }
}
```

Then use it in your router:

```typescript
import { YourModuleService } from './your-module.service';

export const yourModuleRouter = router({
  complexOperation: protectedProcedure.mutation(async ({ ctx }) => {
    const service = new YourModuleService(ctx.prisma);
    return await service.performComplexOperation(ctx.user.userId);
  }),
});
```

## Benefits of This Structure

1. **Scalability**: Easy to add new features without modifying existing code
2. **Maintainability**: Each module is self-contained and easy to understand
3. **Testability**: Modules can be tested in isolation
4. **Type Safety**: Full TypeScript support with tRPC + Zod
5. **Discoverability**: Clear structure makes it easy to find code
6. **Separation of Concerns**: Router, schemas, and business logic are separated

## Best Practices

### 1. Keep Routers Thin

Routers should primarily handle:
- Input validation (via Zod schemas)
- Authentication/authorization checks (via middleware)
- Delegating to services for complex logic
- Returning responses

```typescript
// Good: Thin router, delegates to service
export const userRouter = router({
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new UserService(ctx.prisma);
      return await service.updateProfile(ctx.user.userId, input);
    }),
});

// Avoid: Fat router with business logic inline
export const userRouter = router({
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      // 50+ lines of business logic here...
    }),
});
```

### 2. Centralize Schemas

Keep all Zod schemas in `*.schema.ts` files for reusability:

```typescript
// Good: Reusable schema
export const emailSchema = z.string().email();
export const updateProfileSchema = z.object({
  email: emailSchema,
  // ...
});

// Avoid: Inline schemas
.input(z.object({ email: z.string().email() }))
```

### 3. Use Descriptive Names

- Module names should be feature-focused (e.g., `user`, `payment`, `notification`)
- Procedure names should be action-oriented (e.g., `getProfile`, `updateSettings`, `deleteAccount`)

### 4. Document Your Procedures

Add JSDoc comments to explain:
- What the procedure does
- Input validation rules
- Business rules
- Return type

```typescript
/**
 * Update User Profile
 *
 * Updates the authenticated user's profile information.
 *
 * Input validation:
 * - nickname: 2-50 characters
 * - email: must be unique
 *
 * Business rules:
 * - User must be authenticated
 * - Email cannot be in use by another account
 *
 * @returns Updated user profile
 */
updateProfile: protectedProcedure
  .input(updateProfileSchema)
  .mutation(async ({ ctx, input }) => {
    // Implementation...
  }),
```

## Migration from Old Structure

The old structure used:
```
src/server/routers/
├── _app.ts          # Main router
└── user.ts          # User router
```

This has been replaced with:
```
src/server/router.ts        # Main router
src/modules/user/           # User module
├── user.router.ts
├── user.schema.ts
└── index.ts
```

All imports in `src/index.ts` now use the new structure:
```typescript
import { appRouter } from './server/router';  // Changed from './server/routers/_app'
```

## Testing

Test modules in isolation:

```typescript
import { appRouter } from '@/server/router';
import { createContext } from '@/server/context';

describe('User Module', () => {
  it('should get user profile', async () => {
    const ctx = await createContext({ req, res });
    const caller = appRouter.createCaller(ctx);

    const profile = await caller.user.getProfile();

    expect(profile).toBeDefined();
    expect(profile.email).toBe('test@example.com');
  });
});
```

## Example Modules to Add

Here are some common modules you might want to add:

- **auth**: Authentication (login, register, verify email)
- **payment**: Payment processing (subscriptions, invoices)
- **notification**: Notifications (email, push, in-app)
- **admin**: Admin operations (user management, analytics)
- **upload**: File uploads (images, documents)
- **search**: Search functionality (full-text search, filters)

Each module follows the same pattern: schema + router + optional service.
