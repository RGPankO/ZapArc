#!/usr/bin/env ts-node

import { execSync } from 'child_process';

/**
 * Database setup script
 * This script handles the complete database setup process
 */
async function setupDatabase() {
  try {
    console.log('🚀 Starting database setup...');

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated successfully');

    // Run migrations
    console.log('📦 Running database migrations...');
    try {
      execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
      console.log('✅ Database migrations completed successfully');
    } catch (error) {
      console.warn('⚠️  Migration may have already been applied or database may not exist');
      console.log('🔄 Attempting to deploy existing migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Existing migrations deployed successfully');
    }

    // Run seed script
    if (process.env.NODE_ENV === 'development') {
      console.log('🌱 Running database seed script...');
      execSync('npm run db:seed', { stdio: 'inherit' });
      console.log('✅ Database seeded successfully');
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Make sure your PostgreSQL server is running');
    console.log('2. Update your .env file with the correct DATABASE_URL');
    console.log('3. Run "npm run dev" to start the development server');
    console.log('');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };