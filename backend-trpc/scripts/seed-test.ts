import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('testpassword123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      nickname: 'TestUser',
      passwordHash: passwordHash,
      isVerified: true,
      isEmailVerified: true,
    },
  });

  console.log('User created:', JSON.stringify(user, null, 2));

  // Generate a test token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    { expiresIn: '24h' }
  );

  console.log('\n--- TEST TOKEN ---');
  console.log(token);
  console.log('\n--- CURL COMMANDS ---');
  console.log(`\n# Get Profile:`);
  console.log(`curl -X POST http://localhost:3001/api/trpc/user.getProfile -H "Authorization: Bearer ${token}" -H "Content-Type: application/json"`);
  console.log(`\n# Update Profile:`);
  console.log(`curl -X POST http://localhost:3001/api/trpc/user.updateProfile -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{"nickname":"NewNickname"}'`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
