import { config } from 'dotenv';

// Load environment variables
config();

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export const databaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/mobile_app_skeleton',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000'),
};

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(): void {
  if (!databaseConfig.url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!databaseConfig.url.startsWith('mysql://')) {
    throw new Error('DATABASE_URL must be a valid MySQL connection string');
  }

  if (databaseConfig.maxConnections <= 0) {
    throw new Error('DB_MAX_CONNECTIONS must be a positive number');
  }

  if (databaseConfig.connectionTimeout <= 0) {
    throw new Error('DB_CONNECTION_TIMEOUT must be a positive number');
  }

  if (databaseConfig.queryTimeout <= 0) {
    throw new Error('DB_QUERY_TIMEOUT must be a positive number');
  }

  if (databaseConfig.retryAttempts < 0) {
    throw new Error('DB_RETRY_ATTEMPTS must be a non-negative number');
  }

  if (databaseConfig.retryDelay <= 0) {
    throw new Error('DB_RETRY_DELAY must be a positive number');
  }
}