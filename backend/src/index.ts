import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './utils/database';
import { validateDatabaseConfig } from './config/database';
import { performHealthCheck, startPeriodicHealthCheck } from './utils/healthCheck';
import { logger } from './utils/logger';
import { startSubscriptionExpiryScheduler } from './utils/scheduler';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import adRoutes from './routes/ads';
import paymentRoutes from './routes/payments';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthResult = await performHealthCheck();
    const statusCode = healthResult.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthResult);
  } catch (error) {
    logger.error('Health check endpoint error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Basic API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Mobile App Skeleton API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/payments', paymentRoutes);

// Initialize application
async function initializeApp() {
  try {
    // Validate configuration
    validateDatabaseConfig();
    logger.info('Database configuration validated');

    // Connect to database
    await connectDatabase();
    logger.info('Database connection established');

    // Start periodic health checks in production
    if (process.env.NODE_ENV === 'production') {
      startPeriodicHealthCheck(60000); // Every minute in production
    }

    // Start subscription expiry scheduler
    startSubscriptionExpiryScheduler();

    // Start server - bind to all network interfaces for development
    const HOST = process.env.NODE_ENV === 'production' ? 'localhost' : '0.0.0.0';
    app.listen(PORT, HOST, () => {
      logger.info(`Server is running on ${HOST}:${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info(`API info available at http://localhost:${PORT}/api`);
      if (HOST === '0.0.0.0') {
        logger.info(`Server also accessible on network at http://192.168.6.199:${PORT}`);
      }
    });

  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise);
  process.exit(1);
});

// Initialize the application
initializeApp();

export default app;