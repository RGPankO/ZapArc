# Quick Start Guide

Get your tRPC backend up and running in minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running (Docker or local)
- The database `mobile_skeleton_db` exists

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
The `.env` file is already configured for the Docker PostgreSQL instance:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mobile_skeleton_db"
```

Generate Prisma client and push schema:
```bash
npm run prisma:generate
npm run prisma:push
```

### 3. Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3001`

### 4. Test the Server

#### Check Health Endpoint
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "backend-trpc",
  "port": 3001
}
```

## Testing Protected Endpoints

Protected endpoints require authentication. Here's how to test them:

### 1. Create a Test User (using existing backend or Prisma Studio)

Option A: Use Prisma Studio
```bash
npm run prisma:studio
```

Then create a user manually in the `users` table with a hashed password.

Option B: Use the existing backend's auth endpoints to register a user.

### 2. Generate JWT Token (Option 1: Using Node REPL)

Create a script to generate a token:

```bash
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 'YOUR_USER_ID', email: 'user@example.com', type: 'access' },
  'your-super-secret-jwt-key-change-this-in-production',
  { expiresIn: '24h' }
);
console.log('Token:', token);
"
```

### 3. Test User Procedures

#### Get Profile
```bash
curl -X POST http://localhost:3001/api/trpc/user.getProfile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

#### Update Profile
```bash
curl -X POST http://localhost:3001/api/trpc/user.updateProfile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"Updated Name"}'
```

## Common Issues

### Issue: "Cannot connect to database"
**Solution**: Make sure PostgreSQL is running on port 5432
```bash
# If using Docker:
docker ps | grep postgres

# If using Docker Compose:
cd .. && docker-compose up -d
```

### Issue: "JWT_SECRET is not configured"
**Solution**: Make sure `.env` file exists and contains JWT secrets
```bash
cat .env | grep JWT_SECRET
```

### Issue: "Prisma Client not generated"
**Solution**: Run the generate command
```bash
npm run prisma:generate
```

### Issue: Port 3001 already in use
**Solution**: Change the PORT in `.env` or kill the process using port 3001
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

## Next Steps

1. **Add More Routers**: Create new routers in `src/server/routers/`
2. **Implement Auth Router**: Add login/register procedures
3. **Add Tests**: Create unit and integration tests
4. **Deploy**: Use Docker or your preferred hosting platform

## Useful Commands

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Run database migrations
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## Resources

- [tRPC Documentation](https://trpc.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express Documentation](https://expressjs.com/)
- [Zod Documentation](https://zod.dev/)

Happy coding!
