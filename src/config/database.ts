import { PrismaClient } from '@prisma/client';
import { env } from './env';

export const prisma = new PrismaClient({
  datasources: {
    db: { url: env.DATABASE_URL.includes('pgbouncer=true') ? env.DATABASE_URL : `${env.DATABASE_URL}?pgbouncer=true&connection_limit=10&pool_timeout=30` }
  },
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error']
});
