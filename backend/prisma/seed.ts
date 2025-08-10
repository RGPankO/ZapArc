import { PrismaClient, PaymentModel } from '../src/generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default app configuration
  const defaultAppConfig = await prisma.appConfig.upsert({
    where: { id: 'default-config' },
    update: {},
    create: {
      id: 'default-config',
      appName: 'Mobile App Skeleton',
      primaryColor: '#007AFF',
      secondaryColor: '#5856D6',
      logoUrl: null,
      paymentModel: PaymentModel.BOTH,
      subscriptionPrice: 9.99,
      oneTimePrice: 29.99,
    },
  });

  console.log('✅ Created default app configuration:', defaultAppConfig);

  // Create a test user for development
  if (process.env.NODE_ENV === 'development') {
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        nickname: 'Test User',
        passwordHash: hashedPassword,
        isVerified: true,
        premiumStatus: 'FREE',
      },
    });

    console.log('✅ Created test user:', { 
      id: testUser.id, 
      email: testUser.email, 
      nickname: testUser.nickname 
    });

    // Create a premium test user
    const premiumUser = await prisma.user.upsert({
      where: { email: 'premium@example.com' },
      update: {},
      create: {
        email: 'premium@example.com',
        nickname: 'Premium User',
        passwordHash: hashedPassword,
        isVerified: true,
        premiumStatus: 'PREMIUM_LIFETIME',
      },
    });

    console.log('✅ Created premium test user:', { 
      id: premiumUser.id, 
      email: premiumUser.email, 
      nickname: premiumUser.nickname 
    });
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });