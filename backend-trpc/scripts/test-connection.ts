/**
 * Test Script: Database Connection
 *
 * This script tests the database connection and Prisma setup.
 * Run with: npx tsx scripts/test-connection.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function testConnection() {
  console.log('Testing database connection...\n');

  try {
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('   SUCCESS: Connected to database\n');

    // Test 2: Query execution
    console.log('2. Testing query execution...');
    const userCount = await prisma.user.count();
    console.log(`   SUCCESS: Found ${userCount} users in database\n`);

    // Test 3: Database info
    console.log('3. Database information:');
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    console.log('   PostgreSQL Version:', result[0]?.version.split(' ')[0], result[0]?.version.split(' ')[1]);

    // Test 4: Check tables
    console.log('\n4. Checking tables...');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log(`   Found ${tables.length} tables:`);
    tables.forEach((table) => {
      console.log(`   - ${table.tablename}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('All tests passed! Database is ready to use.');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\nERROR: Database connection failed');
    console.error('Details:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Check your DATABASE_URL in .env file');
    console.error('3. Verify the database "mobile_skeleton_db" exists');
    console.error('4. Run "npm run prisma:push" to create tables\n');

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testConnection();
