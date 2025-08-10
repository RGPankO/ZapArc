# Database Setup Guide

This document provides instructions for setting up and managing the database for the Mobile App Skeleton backend.

## Prerequisites

- MySQL 8.0 or higher
- Node.js 18+ with npm
- Environment variables configured in `.env` file

## Quick Setup

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Update database configuration in `.env`:**
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/mobile_app_skeleton"
   ```

3. **Run the automated setup:**
   ```bash
   npm run db:setup
   ```

This will:
- Generate the Prisma client
- Run database migrations
- Seed the database with initial data (in development)

## Manual Setup Steps

If you prefer to run each step manually:

### 1. Generate Prisma Client
```bash
npm run db:generate
```

### 2. Run Migrations
```bash
# For development (creates migration files)
npm run db:migrate

# For production (applies existing migrations)
npm run db:migrate:deploy
```

### 3. Seed Database (Development Only)
```bash
npm run db:seed
```

## Database Schema

The database includes the following models:

### User
- `id`: Unique identifier (CUID)
- `email`: User email (unique)
- `nickname`: Display name
- `passwordHash`: Hashed password
- `isVerified`: Email verification status
- `verificationToken`: Email verification token
- `premiumStatus`: Premium subscription status
- `premiumExpiry`: Premium subscription expiry date
- `createdAt`, `updatedAt`: Timestamps

### Payment
- `id`: Unique identifier (CUID)
- `userId`: Reference to User
- `type`: Payment type (SUBSCRIPTION, ONE_TIME)
- `amount`: Payment amount
- `currency`: Payment currency
- `status`: Payment status (PENDING, COMPLETED, FAILED, CANCELLED)
- `platformId`: Platform-specific payment ID
- `createdAt`: Timestamp

### Session
- `id`: Unique identifier (CUID)
- `userId`: Reference to User
- `token`: Session token (unique)
- `expiresAt`: Session expiry date
- `createdAt`: Timestamp

### AppConfig
- `id`: Unique identifier (CUID)
- `appName`: Application name
- `primaryColor`, `secondaryColor`: Theme colors
- `logoUrl`: Logo URL (optional)
- `paymentModel`: Payment model (SUBSCRIPTION_ONLY, ONE_TIME_ONLY, BOTH)
- `subscriptionPrice`, `oneTimePrice`: Pricing configuration
- `createdAt`, `updatedAt`: Timestamps

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run db:setup` | Complete database setup (recommended) |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run migrations in development |
| `npm run db:migrate:deploy` | Deploy migrations in production |
| `npm run db:migrate:reset` | Reset database and run all migrations |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

## Environment Variables

Required environment variables for database configuration:

```env
# Database Configuration
DATABASE_URL="mysql://username:password@localhost:3306/database_name"

# Optional Database Settings
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=10000
DB_QUERY_TIMEOUT=30000
DB_RETRY_ATTEMPTS=3
DB_RETRY_DELAY=1000
```

## Development Data

In development mode, the seed script creates:

1. **Default App Configuration:**
   - App name: "Mobile App Skeleton"
   - Primary color: #007AFF
   - Secondary color: #5856D6
   - Payment model: Both subscription and one-time
   - Subscription price: $9.99
   - One-time price: $29.99

2. **Test Users:**
   - Regular user: `test@example.com` / `testpassword123`
   - Premium user: `premium@example.com` / `testpassword123`

## Database Utilities

The application includes several database utilities:

### Connection Management
- `getPrismaClient()`: Get singleton Prisma client instance
- `connectDatabase()`: Establish database connection
- `disconnectDatabase()`: Close database connection
- `testDatabaseConnection()`: Test database connectivity

### Transaction Support
- `withTransaction(callback)`: Execute operations within a transaction

### Error Handling
- `handlePrismaError(error)`: Convert Prisma errors to custom error types
- Custom error classes: `DatabaseError`, `DatabaseConnectionError`, `DatabaseValidationError`, `DatabaseTransactionError`

### Health Checks
- `performHealthCheck()`: Comprehensive application health check
- `checkDatabaseHealth()`: Database-specific health check
- `startPeriodicHealthCheck()`: Start periodic health monitoring

## Troubleshooting

### Common Issues

1. **Connection Refused:**
   - Ensure MySQL server is running
   - Verify connection string in `DATABASE_URL`
   - Check firewall settings

2. **Migration Errors:**
   - Ensure database exists before running migrations
   - Check user permissions for schema modifications
   - Use `npm run db:migrate:reset` to start fresh

3. **Prisma Client Errors:**
   - Run `npm run db:generate` after schema changes
   - Restart your development server after client generation

4. **Seed Script Failures:**
   - Ensure migrations have been applied first
   - Check for unique constraint violations
   - Verify test data doesn't conflict with existing data

### Logs and Monitoring

The application logs database operations:
- Query logs (development only)
- Error logs
- Connection status
- Health check results

Access logs through the application logger or check the health endpoint at `/health`.

## Production Considerations

1. **Security:**
   - Use strong database passwords
   - Enable SSL/TLS for database connections
   - Restrict database access to application servers only

2. **Performance:**
   - Configure connection pooling
   - Monitor query performance
   - Set up database indexing for frequently queried fields

3. **Backup:**
   - Implement regular database backups
   - Test backup restoration procedures
   - Consider point-in-time recovery options

4. **Monitoring:**
   - Set up database performance monitoring
   - Configure alerts for connection issues
   - Monitor disk space and memory usage