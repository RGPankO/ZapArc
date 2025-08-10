import { PrismaClient } from '../generated/prisma';
import { logger } from './logger';

// Global variable to store the Prisma client instance
let prisma: PrismaClient | null = null;

/**
 * Get or create a Prisma client instance
 * Implements singleton pattern to avoid multiple connections
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
    
    logger.info('Prisma client initialized');
  }

  return prisma;
}

/**
 * Connect to the database
 * @returns Promise<void>
 */
export async function connectDatabase(): Promise<void> {
  try {
    const client = getPrismaClient();
    await client.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw new DatabaseConnectionError('Failed to connect to database');
  }
}

/**
 * Disconnect from the database
 * @returns Promise<void>
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
      logger.info('Database disconnected successfully');
    }
  } catch (error) {
    logger.error('Failed to disconnect from database:', error);
    throw new DatabaseConnectionError('Failed to disconnect from database');
  }
}

/**
 * Test database connection
 * @returns Promise<boolean>
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Handle database transaction with automatic rollback on error
 * @param callback - Function to execute within transaction
 * @returns Promise<T>
 */
export async function withTransaction<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const client = getPrismaClient();
  
  try {
    return await client.$transaction(async (tx) => {
      return await callback(tx as PrismaClient);
    });
  } catch (error) {
    logger.error('Transaction failed:', error);
    throw new DatabaseTransactionError('Transaction failed', error);
  }
}

/**
 * Custom database error classes
 */
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseTransactionError extends DatabaseError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    this.name = 'DatabaseTransactionError';
  }
}

export class DatabaseValidationError extends DatabaseError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    this.name = 'DatabaseValidationError';
  }
}

/**
 * Handle Prisma errors and convert them to custom errors
 * @param error - The error to handle
 * @returns DatabaseError
 */
export function handlePrismaError(error: unknown): DatabaseError {
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; message: string };
    
    switch (prismaError.code) {
      case 'P2002':
        return new DatabaseValidationError('Unique constraint violation');
      case 'P2025':
        return new DatabaseValidationError('Record not found');
      case 'P2003':
        return new DatabaseValidationError('Foreign key constraint violation');
      case 'P2016':
        return new DatabaseValidationError('Query interpretation error');
      case 'P1001':
        return new DatabaseConnectionError('Cannot reach database server');
      case 'P1002':
        return new DatabaseConnectionError('Database server timeout');
      case 'P1008':
        return new DatabaseConnectionError('Operations timed out');
      default:
        return new DatabaseError(`Database operation failed: ${prismaError.message}`);
    }
  }
  
  return new DatabaseError('Unknown database error', error);
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connection...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connection...');
  await disconnectDatabase();
  process.exit(0);
});