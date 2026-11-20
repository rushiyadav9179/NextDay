import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/nextday?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('super-secret-jwt-key-replace-in-production-123456789'),
  JWT_REFRESH_SECRET: z.string().default('super-secret-refresh-key-replace-in-production-987654321'),
  COOKIE_SECRET: z.string().default('super-secret-cookie-sign-key-replace-in-production'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  GEMINI_API_KEY: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.string().transform((val) => (val ? Number(val) : 587)).default('587'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('NextDay HR <noreply@nextday.work>'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:4000'),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === 'production') {
  const requiredValues = ['DATABASE_URL', 'REDIS_URL'] as const;
  for (const key of requiredValues) {
    if (!process.env[key]?.trim()) {
      throw new Error(`${key} must be configured in production.`);
    }
  }

  let redisProtocol: string;
  try {
    redisProtocol = new URL(process.env.REDIS_URL!).protocol;
  } catch {
    throw new Error('REDIS_URL must be a valid TLS Redis URL in production.');
  }
  if (redisProtocol !== 'rediss:') {
    throw new Error('REDIS_URL must use TLS (rediss://) in production.');
  }

  const productionSecrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET'] as const;
  for (const key of productionSecrets) {
    const value = process.env[key]?.trim();
    if (!value || value.length < 32 || value.startsWith('super-secret-')) {
      throw new Error(`${key} must be explicitly configured with at least 32 characters in production.`);
    }
  }
}
