// eslint-disable-next-line @typescript-eslint/no-var-requires
const Fastify = require('fastify');
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { randomUUID } from 'crypto';
import { env, getCorsOrigins } from '../../config/env';
import { errorHandler } from './middleware/error.handler';
import authPlugin from './plugins/auth.plugin';
import { prisma } from '../db/prisma.client';
import { redis } from '../redis/redis.client';
import { resumeParsingQueue } from '../queue/queues/resume.queue';
import { MAX_RESUME_FILE_SIZE_BYTES } from '../../config/constants';
import type { FastifyInstance } from 'fastify';

export async function buildServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    genReqId: (req: any) => {
      return (req.headers['x-request-id'] as string) ?? randomUUID();
    },
  });

  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, {
    origin: getCorsOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req: any) => req.user?.sub ?? req.ip ?? 'anonymous',
  });
  await fastify.register(multipart, {
    limits: {
      fileSize: MAX_RESUME_FILE_SIZE_BYTES,
      files: 1,
      fieldNameSize: 100,
      fieldSize: 1000,
    },
  });
  await fastify.register(authPlugin);

  fastify.setErrorHandler(errorHandler);

  fastify.get('/health', async (_request: any, reply: any) => {
    const checks = await Promise.allSettled([
      prisma.$queryRaw`SELECT 1`,
      redis.ping(),
      resumeParsingQueue.getJobCounts(),
    ]);

    const [db, redisCheck, queueCheck] = checks;

    return reply.send({
      status: checks.every((c) => c.status === 'fulfilled') ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: db.status === 'fulfilled' ? 'ok' : 'error',
        redis: redisCheck.status === 'fulfilled' ? 'ok' : 'error',
        queue: queueCheck.status === 'fulfilled' ? 'ok' : 'error',
        queueCounts:
          queueCheck.status === 'fulfilled' && 'value' in queueCheck
            ? queueCheck.value
            : null,
      },
    });
  });

  return fastify;
}
