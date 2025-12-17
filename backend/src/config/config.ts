import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string(),

  // JWT
  JWT_SECRET: z.string().default('your-secret-key'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('your-refresh-secret-key'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Email
  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().optional(),

  // App
  APP_NAME: z.string().default('Mobile App'),
  APP_URL: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:8081'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export const environmentConfig = {
  // Server
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',

  // Database
  databaseUrl: env.DATABASE_URL,

  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  // Email
  email: {
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM || 'noreply@example.com',
  },

  // App
  app: {
    name: env.APP_NAME,
    url: env.APP_URL,
    frontendUrl: env.FRONTEND_URL,
  },

  // Google OAuth
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
  },
} as const;

export type EnvironmentConfig = typeof environmentConfig;
