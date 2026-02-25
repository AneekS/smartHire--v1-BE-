import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key format'),
  OPENAI_PARSE_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_SUGGEST_MODEL: z.string().default('gpt-4o'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string().min(1),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export function getCorsOrigins(): string[] {
  if (env.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(',').map((url) => url.trim()).filter(Boolean);
  }
  return [env.FRONTEND_URL];
}
