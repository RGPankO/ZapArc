import { getPrismaClient, testDatabaseConnection } from './database';
import { logger } from './logger';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  database: {
    connected: boolean;
    responseTime?: number;
    error?: string;
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * Perform comprehensive health check
 * @returns Promise<HealthCheckResult>
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Memory usage
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryPercentage = (usedMemory / totalMemory) * 100;

  // Database health check
  let databaseHealth: HealthCheckResult['database'];
  
  try {
    const dbStartTime = Date.now();
    const isConnected = await testDatabaseConnection();
    const responseTime = Date.now() - dbStartTime;
    
    databaseHealth = {
      connected: isConnected,
      responseTime,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    databaseHealth = {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  // Overall status
  const isHealthy = databaseHealth.connected && memoryPercentage < 90;

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp,
    database: databaseHealth,
    uptime: process.uptime(),
    memory: {
      used: usedMemory,
      total: totalMemory,
      percentage: Math.round(memoryPercentage * 100) / 100,
    },
  };
}

/**
 * Database-specific health check
 * @returns Promise<boolean>
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    
    // Test basic connectivity
    await client.$queryRaw`SELECT 1 as test`;
    
    // Test table access
    await client.user.count();
    
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Periodic health check that logs results
 * @param intervalMs - Interval in milliseconds (default: 30 seconds)
 */
export function startPeriodicHealthCheck(intervalMs: number = 30000): NodeJS.Timeout {
  logger.info(`Starting periodic health checks every ${intervalMs}ms`);
  
  return setInterval(async () => {
    try {
      const health = await performHealthCheck();
      
      if (health.status === 'healthy') {
        logger.debug('Health check passed', {
          database: health.database.connected,
          memory: `${health.memory.percentage}%`,
          uptime: `${Math.round(health.uptime)}s`,
        });
      } else {
        logger.warn('Health check failed', health);
      }
    } catch (error) {
      logger.error('Health check error:', error);
    }
  }, intervalMs);
}

/**
 * Stop periodic health check
 * @param interval - The interval returned by startPeriodicHealthCheck
 */
export function stopPeriodicHealthCheck(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  logger.info('Stopped periodic health checks');
}