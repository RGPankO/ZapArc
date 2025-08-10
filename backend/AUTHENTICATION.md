# Authentication System

This document describes the authentication system implemented for the mobile app skeleton backend.

## Overview

The authentication system provides:
- User registration with email verification
- Secure login with JWT tokens
- Password hashing using bcrypt
- Refresh token mechanism
- Email verification system
- Password validation
- Protected route middleware

## Components

### 1. Authentication Utilities (`src/utils/auth.ts`)

Core authentication functions:
- `hashPassword(password)` - Hash passwords using bcrypt
- `verifyPassword(password, hash)` - Verify password against hash
- `generateTokenPair(userId, email)` - Generate access and refresh tokens
- `verifyToken(token, type)` - Verify and decode JWT tokens
- `generateVerificationToken()` - Generate secure verification tokens
- `validatePassword(password)` - Validate password strength
- `validateEmail(email)` - Validate email format

### 2. Authentication Service (`src/services/authService.ts`)

Business logic for authentication:
- `register(data)` - Register new users with email verification
- `login(data)` - Authenticate users and return tokens
- `verifyEmail(token)` - Verify user email addresses
- `refreshToken(refreshToken)` - Generate new access tokens
- `logout(refreshToken)` - Invalidate refresh tokens
- `cleanupExpiredSessions()` - Remove expired sessions

### 3. Email Service (`src/services/emailService.ts`)

Email functionality:
- `sendVerificationEmail()` - Send email verification emails
- `sendPasswordResetEmail()` - Send password reset emails
- Configurable email templates
- Error handling for email failures

### 4. Authentication Middleware (`src/middleware/auth.ts`)

Route protection middleware:
- `authenticateToken` - Require valid access token
- `requireVerifiedEmail` - Require verified email address
- `requirePremium` - Require premium subscription
- `optionalAuth` - Optional authentication for public routes

### 5. Authentication Controller (`src/controllers/authController.ts`)

HTTP endpoint handlers:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/refresh-token` - Token refresh
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile (protected)

## Security Features

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, and number
- Hashed using bcrypt with 12 salt rounds

### Token Security
- JWT tokens with short expiration (15 minutes for access tokens)
- Separate refresh tokens with longer expiration (7 days)
- Tokens include issuer and audience validation
- Refresh tokens stored in database for revocation

### Email Verification
- Required for account activation
- Secure random verification tokens
- Tokens expire after 24 hours

## Environment Variables

Required environment variables:

```env
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_FROM=noreply@example.com
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "nickname": "username",
  "password": "SecurePassword123"
}
```

### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

### Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "refresh-token-from-login"
}
```

### Logout
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "refresh-token-to-invalidate"
}
```

### Get Profile (Protected)
```http
GET /api/auth/profile
Authorization: Bearer access-token
```

## Error Handling

The system returns consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": ["Additional error details if applicable"]
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Invalid input data
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `INVALID_EMAIL` - Invalid email format
- `USER_EXISTS` - Email already registered
- `INVALID_CREDENTIALS` - Wrong email/password
- `EMAIL_NOT_VERIFIED` - Account not verified
- `INVALID_TOKEN` - Invalid or expired token

## Testing

Run authentication tests:
```bash
npm test -- --testPathPatterns=auth-utils.test.ts
```

The test suite covers:
- Password hashing and verification
- Password validation rules
- Email validation
- Token generation and verification
- Error handling

## Usage Examples

### Protecting Routes
```typescript
import { authenticateToken, requireVerifiedEmail } from '../middleware/auth';

// Require authentication
router.get('/protected', authenticateToken, handler);

// Require verified email
router.get('/verified-only', authenticateToken, requireVerifiedEmail, handler);

// Optional authentication
router.get('/public', optionalAuth, handler);
```

### Using Authentication Service
```typescript
import { authService } from '../services/authService';

// Register user
const result = await authService.register({
  email: 'user@example.com',
  nickname: 'username',
  password: 'SecurePassword123'
});

// Login user
const loginResult = await authService.login({
  email: 'user@example.com',
  password: 'SecurePassword123'
});
```

## Database Schema

The authentication system uses these database models:

- `User` - User accounts with credentials and verification status
- `Session` - Refresh token storage for session management
- `Payment` - Premium subscription tracking
- `AppConfig` - Application configuration

See `prisma/schema.prisma` for complete schema definitions.