# Backend tRPC

A modern, type-safe backend built with tRPC, Express, Prisma, and TypeScript.

## Features

- **tRPC v11**: End-to-end type-safe API
- **Express**: Robust web framework
- **Prisma ORM**: Type-safe database client
- **PostgreSQL**: Production-ready database
- **JWT Authentication**: Secure token-based auth
- **Zod Validation**: Runtime type validation
- **TypeScript**: Full type safety

## Project Structure

```
backend-trpc/
├── src/
│   ├── server/
│   │   ├── trpc.ts           # tRPC initialization & middleware
│   │   ├── context.ts        # Request context (Prisma + Auth)
│   │   └── routers/
│   │       ├── _app.ts       # Root router
│   │       └── user.ts       # User procedures
│   ├── utils/
│   │   └── auth.ts           # JWT & bcrypt utilities
│   └── index.ts              # Express server entry
├── prisma/
│   └── schema.prisma         # Database schema
├── package.json
├── tsconfig.json
└── .env.example
```

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret key for JWT signing
   - `JWT_REFRESH_SECRET`: Secret key for refresh tokens

3. **Generate Prisma client:**
   ```bash
   npm run prisma:generate
   ```

4. **Push schema to database:**
   ```bash
   npm run prisma:push
   ```

## Running the Server

### Development Mode
```bash
npm run dev
```
Server runs on `http://localhost:3001` with hot reload.

### Production Mode
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

Returns server status and information.

### tRPC Endpoint
```
POST /api/trpc/*
```

All tRPC procedures are accessible through this endpoint.

## Available Procedures

### User Router

#### `user.getProfile`
**Type**: Query (Protected)
**Description**: Get authenticated user's profile
**Returns**: User profile object

#### `user.updateProfile`
**Type**: Mutation (Protected)
**Description**: Update user profile information
**Input**:
```typescript
{
  nickname?: string;      // 2-50 characters
  email?: string;         // Valid email, must be unique
  firstName?: string;     // 1-50 characters
  lastName?: string;      // 1-50 characters
  profilePicture?: string; // Valid URL
}
```
**Returns**: Updated user profile

#### `user.changePassword`
**Type**: Mutation (Protected)
**Description**: Change user password
**Input**:
```typescript
{
  currentPassword: string;  // Current password
  newPassword: string;      // 8-100 characters
}
```
**Returns**: Success message

#### `user.deleteAccount`
**Type**: Mutation (Protected)
**Description**: Delete user account permanently
**Input**:
```typescript
{
  password?: string;        // Required if account has password
  confirmation: "DELETE";   // Must be exactly "DELETE"
}
```
**Returns**: Success message

## Authentication

All protected procedures require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

The token should be generated using the `generateAccessToken` utility from `src/utils/auth.ts`.

## Example Usage

### Using tRPC Client (TypeScript)

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './server/routers/_app';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
      headers() {
        return {
          authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
});

// Get user profile
const profile = await client.user.getProfile.query();

// Update profile
const updated = await client.user.updateProfile.mutate({
  nickname: 'John Doe',
  email: 'john@example.com',
});

// Change password
await client.user.changePassword.mutate({
  currentPassword: 'oldpass123',
  newPassword: 'newpass123',
});

// Delete account
await client.user.deleteAccount.mutate({
  password: 'mypassword',
  confirmation: 'DELETE',
});
```

### Using HTTP Client (curl)

```bash
# Get profile
curl -X POST http://localhost:3001/api/trpc/user.getProfile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Update profile
curl -X POST http://localhost:3001/api/trpc/user.updateProfile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"John Doe","email":"john@example.com"}'

# Change password
curl -X POST http://localhost:3001/api/trpc/user.changePassword \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"oldpass","newPassword":"newpass123"}'

# Delete account
curl -X POST http://localhost:3001/api/trpc/user.deleteAccount \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"password":"mypass","confirmation":"DELETE"}'
```

## Database Management

### Prisma Studio
Open a visual editor for your database:
```bash
npm run prisma:studio
```

### Run Migrations
Apply database migrations:
```bash
npm run prisma:migrate
```

### Generate Client
Regenerate Prisma client after schema changes:
```bash
npm run prisma:generate
```

## Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Protected Procedures**: Middleware-enforced authentication
- **Input Validation**: Zod schemas for all inputs
- **Session Management**: Automatic token invalidation on password change

## Error Handling

The API uses tRPC error codes:
- `UNAUTHORIZED`: Authentication required or failed
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict (e.g., email already exists)
- `BAD_REQUEST`: Invalid input or business logic error

## Development Tips

1. **Type Safety**: The entire API is type-safe from client to database
2. **Hot Reload**: Changes are automatically reflected in development mode
3. **Logging**: Enable Prisma query logging in `.env` for debugging
4. **Testing**: Import `appRouter` to create test callers with custom context

## License

MIT
