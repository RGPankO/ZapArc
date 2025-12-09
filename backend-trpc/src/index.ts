import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './server/routers/_app';
import { createContext } from './server/context';

// Load environment variables
dotenv.config();

/**
 * Express server with tRPC integration.
 *
 * This server provides:
 * - tRPC API endpoint at /api/trpc
 * - Health check endpoint at /health
 * - CORS support for cross-origin requests
 */

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Middleware Configuration
 */

// Enable CORS for all routes
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

/**
 * Health Check Endpoint
 *
 * Returns server status and timestamp.
 * Useful for monitoring and load balancer health checks.
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'backend-trpc',
    port: PORT,
  });
});

/**
 * tRPC API Endpoint
 *
 * All tRPC procedures are accessible through this endpoint.
 * The endpoint is mounted at /api/trpc.
 *
 * Example requests:
 * - GET  /api/trpc/user.getProfile
 * - POST /api/trpc/user.updateProfile
 * - POST /api/trpc/user.changePassword
 * - POST /api/trpc/user.deleteAccount
 */
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, type, path, input }) {
      // Log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`[tRPC Error] ${type} ${path}:`, error);
        if (input) {
          console.error('Input:', input);
        }
      }

      // In production, you might want to send errors to a monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to Sentry, DataDog, etc.
        // errorReporter.captureException(error);
      }
    },
  })
);

/**
 * 404 Handler
 *
 * Returns a JSON error for undefined routes.
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: {
      health: 'GET /health',
      trpc: 'POST /api/trpc/*',
    },
  });
});

/**
 * Global Error Handler
 *
 * Catches any unhandled errors in Express middleware.
 */
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

/**
 * Start Server
 */
app.listen(PORT, () => {
  console.log('================================================');
  console.log(`Server: backend-trpc`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`tRPC Endpoint: http://localhost:${PORT}/api/trpc`);
  console.log('================================================');
});

/**
 * Graceful Shutdown
 *
 * Handles SIGINT and SIGTERM signals to close the server gracefully.
 */
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});
