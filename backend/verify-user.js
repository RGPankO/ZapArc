// Simple script to manually verify a user for testing
import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function verifyUser(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`User with email ${email} not found`);
      return;
    }

    if (user.isVerified) {
      console.log(`User ${email} is already verified`);
      return;
    }

    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationToken: null
      }
    });

    console.log(`✅ User ${email} has been verified successfully`);
  } catch (error) {
    console.error('Error verifying user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log('Usage: node verify-user.js <email>');
  process.exit(1);
}

verifyUser(email);