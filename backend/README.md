# Backend API

Node.js Express backend for the Mobile App Skeleton.

## Structure

```
src/
├── controllers/     # Request handlers
├── services/       # Business logic
├── models/         # Data models
├── middleware/     # Express middleware
├── routes/         # API routes
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
├── config/         # Configuration files
├── __tests__/      # Test files
└── index.ts        # Application entry point
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication (to be implemented)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### User Management (to be implemented)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password
- `DELETE /api/users/account` - Delete account

### Payments (to be implemented)
- `GET /api/payments/plans` - Get payment plans
- `POST /api/payments/subscribe` - Create subscription
- `POST /api/payments/purchase` - One-time purchase
- `GET /api/payments/status` - Payment status
- `POST /api/payments/webhook` - Payment webhooks

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - JWT signing secret
- `EMAIL_*` - Email service configuration

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```