# Backend tRPC - Complete Setup Guide

This guide will walk you through setting up the tRPC backend from scratch.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm or yarn package manager
- [ ] PostgreSQL database running
- [ ] Database `mobile_skeleton_db` exists
- [ ] Git (optional, for version control)

## Installation Steps

### Step 1: Install Dependencies

Navigate to the backend-trpc directory and install all required packages:

```bash
cd backend-trpc
npm install
```

Expected output:
```
added XXX packages
```

### Step 2: Configure Environment Variables

The `.env` file is pre-configured, but verify the settings:

```bash
cat .env
```

Key variables:
- `PORT=3001` - Server port (must not conflict with existing backend on 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing access tokens
- `JWT_REFRESH_SECRET` - Secret for signing refresh tokens

**IMPORTANT**: Change JWT secrets in production!

### Step 3: Test Database Connection

Run the connection test script:

```bash
npx tsx scripts/test-connection.ts
```

Expected output:
```
Testing database connection...

1. Testing database connection...
   SUCCESS: Connected to database

2. Testing query execution...
   SUCCESS: Found X users in database

All tests passed! Database is ready to use.
```

If this fails:
1. Verify PostgreSQL is running: `docker ps` or `psql -U postgres`
2. Check database exists: `psql -U postgres -c "\l"`
3. Create database if needed: `psql -U postgres -c "CREATE DATABASE mobile_skeleton_db"`

### Step 4: Generate Prisma Client

Generate the Prisma client based on the schema:

```bash
npm run prisma:generate
```

Expected output:
```
✔ Generated Prisma Client
```

This creates the `@prisma/client` with TypeScript types for your database models.

### Step 5: Push Database Schema

Push the Prisma schema to your database (creates/updates tables):

```bash
npm run prisma:push
```

Expected output:
```
The database is now in sync with your Prisma schema.
✔ Generated Prisma Client
```

This creates all tables (users, sessions, refresh_tokens, payments, etc.) in your database.

### Step 6: Verify Database Schema

Open Prisma Studio to visually inspect your database:

```bash
npm run prisma:studio
```

This opens a browser at `http://localhost:5555` where you can:
- View all tables
- Browse existing data
- Create test records
- Verify schema is correct

### Step 7: Start Development Server

Start the server in development mode with hot reload:

```bash
npm run dev
```

Expected output:
```
================================================
Server: backend-trpc
Environment: development
Port: 3001
Health Check: http://localhost:3001/health
tRPC Endpoint: http://localhost:3001/api/trpc
================================================
```

### Step 8: Verify Server is Running

Test the health endpoint:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-09T...",
  "service": "backend-trpc",
  "port": 3001
}
```

## Architecture Overview

### Project Structure

```
backend-trpc/
├── src/
│   ├── index.ts              # Express server & tRPC setup
│   ├── server/
│   │   ├── context.ts        # Request context (DB + Auth)
│   │   ├── trpc.ts           # tRPC config & middleware
│   │   └── routers/
│   │       ├── _app.ts       # Root router (combines all routers)
│   │       └── user.ts       # User management procedures
│   └── utils/
│       └── auth.ts           # JWT & bcrypt utilities
├── prisma/
│   └── schema.prisma         # Database schema
├── scripts/
│   └── test-connection.ts    # DB connection test
└── examples/
    └── client-usage.ts       # tRPC client examples
```

### Request Flow

1. **Client** sends request to `/api/trpc/user.getProfile`
2. **Express** receives request
3. **tRPC Adapter** parses the request
4. **Context** extracts JWT token and authenticates user
5. **Middleware** verifies user is authenticated (for protected procedures)
6. **Procedure** executes business logic with Prisma
7. **Response** returns typed JSON data to client

### Authentication Flow

```
Client Request
    ↓
Authorization Header: "Bearer <JWT>"
    ↓
createContext() extracts token
    ↓
verifyAccessToken() validates JWT
    ↓
ctx.user = { userId, email }
    ↓
protectedProcedure checks ctx.user exists
    ↓
Procedure executes with authenticated context
```

## Testing the API

### Option 1: Using cURL

```bash
# Note: Replace YOUR_TOKEN with a valid JWT token

# Get user profile
curl -X POST http://localhost:3001/api/trpc/user.getProfile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Update profile
curl -X POST http://localhost:3001/api/trpc/user.updateProfile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"Test User","email":"test@example.com"}'
```

### Option 2: Using Postman

1. Create new POST request to `http://localhost:3001/api/trpc/user.getProfile`
2. Add header: `Authorization: Bearer YOUR_TOKEN`
3. Add header: `Content-Type: application/json`
4. Send request

### Option 3: Using TypeScript Client

See `examples/client-usage.ts` for complete examples:

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './src/server/routers/_app';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
      headers: () => ({
        authorization: `Bearer ${token}`,
      }),
    }),
  ],
});

const profile = await client.user.getProfile.query();
```

## Generating Test Tokens

To test protected endpoints, you need a JWT token. Here are two ways to generate one:

### Method 1: Using Node.js

```bash
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 'test-user-id', email: 'test@example.com', type: 'access' },
  'your-super-secret-jwt-key-change-this-in-production',
  { expiresIn: '24h' }
);
console.log('Token:', token);
"
```

### Method 2: Create a user first

1. Use the existing backend on port 3000 to register a user
2. Login to get access token
3. Use that token to test tRPC endpoints

### Method 3: Using Prisma Studio

1. Open Prisma Studio: `npm run prisma:studio`
2. Create a user in the `users` table
3. Note the user's `id`
4. Use Method 1 with that user ID

## Production Deployment

### Build for Production

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### Start Production Server

```bash
npm start
```

### Environment Variables for Production

Update `.env` for production:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://user:password@prod-host:5432/prod_db"
JWT_SECRET="use-a-strong-random-secret-here"
JWT_REFRESH_SECRET="use-another-strong-random-secret"
```

**Security Checklist:**
- [ ] Change all JWT secrets to strong random values
- [ ] Use environment variables (not .env file)
- [ ] Enable HTTPS/TLS
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Use a process manager (PM2, systemd)
- [ ] Set up firewall rules

## Common Issues & Solutions

### Issue: "Cannot find module '@prisma/client'"

**Solution:**
```bash
npm run prisma:generate
```

### Issue: "Database does not exist"

**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE mobile_skeleton_db"
```

### Issue: "Port 3001 already in use"

**Solution:**
```bash
# Find process using port
netstat -ano | findstr :3001  # Windows
lsof -ti:3001                 # Linux/Mac

# Kill process or change PORT in .env
```

### Issue: "JWT verification failed"

**Solutions:**
- Check token is not expired
- Verify JWT_SECRET matches the one used to sign token
- Ensure token format is "Bearer <token>" in Authorization header

### Issue: "UNAUTHORIZED: Authentication required"

**Solutions:**
- Include Authorization header: `Authorization: Bearer <token>`
- Verify token is valid and not expired
- Check user exists in database

## Next Steps

Now that your backend is set up, you can:

1. **Add More Routers**: Create routers for auth, payments, etc.
2. **Implement Auth**: Add login/register procedures
3. **Add Tests**: Write unit and integration tests
4. **Connect Frontend**: Integrate with React Native app
5. **Add Validation**: Enhance Zod schemas
6. **Improve Security**: Add rate limiting, CORS configuration
7. **Monitor**: Set up logging and error tracking

## Resources

- [tRPC Documentation](https://trpc.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zod Documentation](https://zod.dev)
- [Express Documentation](https://expressjs.com)

## Support

If you encounter issues:

1. Check server logs for errors
2. Verify database connection
3. Test with cURL/Postman first
4. Check JWT token is valid
5. Review the README.md and QUICKSTART.md

Happy coding!
