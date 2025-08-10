#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { logger } from '../src/utils/logger';
import { validateDatabaseConfig } from '../src/config/database';

/**
 * Database setup script
 * This script handles the complete database setup process
 */
async function setupDatabase() {
  try {
    logger.info('🚀 Starting database setup...');

    // Validate configuration
    logger.info('📋 Validating database configuration...');
    validateDatabaseConfig();
    logger.info('✅ Database configuration is valid');

    // Generate Prisma client
    logger.info('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    logger.info('✅ Prisma client generated successfully');

    // Run migrations
    logger.info('📦 Running database migrations...');
    try {
      execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
      logger.info('✅ Database migrations completed successfully');
    } catch (error) {
      logger.warn('⚠️  Migration may have already been applied or database may not exist');
      logger.info('🔄 Attempting to deploy existing migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      logger.info('✅ Existing migrations deployed successfully');
    }

    // Run seed script
    if (process.env.NODE_ENV === 'development') {
      logger.info('🌱 Running database seed script...');
      execSync('npm run db:seed', { stdio: 'inherit' });
      logger.info('✅ Database seeded successfully');
    }

    logger.info('🎉 Database setup completed successfully!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Make sure your MySQL server is running');
    logger.info('2. Update your .env file with the correct DATABASE_URL');
    logger.info('3. Run "npm run dev" to start the development server');
    logger.info('');

  } catch (error) {
    logger.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}

export { setupDatabase };