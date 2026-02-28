import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string(),
  AWS_S3_BUCKET_NAME: z.string(),
  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  INTERNAL_API_SECRET: z.string().min(32),
  RESUME_PARSE_WEBHOOK_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ALLOWED_ORIGINS: z.string()
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Missing/invalid exact environment variables:", parsed.error);
  process.exit(1);
}
export const env: any = {
  ...parsed.data,
  CORS_ALLOWED_ORIGINS_ARRAY: parsed.data.CORS_ALLOWED_ORIGINS.split(',').map((s: string) => s.trim())
};
