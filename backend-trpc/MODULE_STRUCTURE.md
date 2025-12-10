# Module Structure Quick Reference

## Current Structure

```
backend-trpc/src/
├── modules/                          # Feature modules
│   └── user/                         # User module
│       ├── user.router.ts            # User procedures
│       ├── user.schema.ts            # User input schemas
│       └── index.ts                  # Module exports
│
├── server/                           # Server configuration
│   ├── trpc.ts                       # tRPC init + middleware
│   ├── context.ts                    # Request context
│   └── router.ts                     # Main app router
│
├── utils/                            # Shared utilities
│   └── auth.ts                       # Auth helpers
│
└── index.ts                          # Express server
```

## Adding a New Module (3 Simple Steps)

### 1. Create Module Files

```bash
mkdir src/modules/payment
touch src/modules/payment/payment.schema.ts
touch src/modules/payment/payment.router.ts
touch src/modules/payment/index.ts
```

### 2. Write Your Module

**payment.schema.ts**
```typescript
import { z } from 'zod';

export const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
```

**payment.router.ts**
```typescript
import { router, protectedProcedure } from '../../server/trpc';
import { createPaymentSchema } from './payment.schema';

export const paymentRouter = router({
  create: protectedProcedure
    .input(createPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      // Implementation
      return { success: true };
    }),
});
```

**index.ts**
```typescript
export { paymentRouter } from './payment.router';
export { createPaymentSchema, type CreatePaymentInput } from './payment.schema';
```

### 3. Register in Main Router

**src/server/router.ts**
```typescript
import { router } from './trpc';
import { userRouter } from '../modules/user';
import { paymentRouter } from '../modules/payment';  // Add this

export const appRouter = router({
  user: userRouter,
  payment: paymentRouter,  // Add this
});

export type AppRouter = typeof appRouter;
```

Done! Your payment module is now available at `/api/trpc/payment.*`

## File Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Router | `{module}.router.ts` | `user.router.ts` |
| Schema | `{module}.schema.ts` | `user.schema.ts` |
| Service | `{module}.service.ts` | `user.service.ts` |
| Index | `index.ts` | `index.ts` |

## Module Checklist

When creating a new module, ensure:

- [ ] Module directory created in `src/modules/`
- [ ] Schema file with Zod validation schemas
- [ ] Router file with tRPC procedures
- [ ] Index file exporting public APIs
- [ ] Module registered in `src/server/router.ts`
- [ ] JSDoc comments on procedures
- [ ] Input validation on all mutations
- [ ] Authentication where needed (use `protectedProcedure`)

## Benefits

1. **One import per module**: Register in router.ts and you're done
2. **Self-contained**: Each module has all its code in one place
3. **Type-safe**: Full TypeScript + Zod + tRPC type inference
4. **Scalable**: Add 100 modules without touching existing code
5. **Testable**: Test modules in isolation
6. **Clear ownership**: Each module is easy to find and maintain

## Migration Completed

Old structure:
```
src/server/routers/_app.ts    -> src/server/router.ts
src/server/routers/user.ts    -> src/modules/user/user.router.ts
                              -> src/modules/user/user.schema.ts
                              -> src/modules/user/index.ts
```

All imports updated, old files deleted.
