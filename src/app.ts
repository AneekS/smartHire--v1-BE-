import 'dotenv/config';
import { env } from './config/env';
import { buildServer } from './infrastructure/http/server';
import { prisma } from './infrastructure/db/prisma.client';
import { redis } from './infrastructure/redis/redis.client';
import { authRoutes } from './modules/auth/auth.routes';
import { candidateRoutes } from './modules/candidate/candidate.routes';
import { resumeRoutes } from './modules/resume/resume.routes';
import { jobsRoutes } from './modules/jobs/jobs.routes';
import { applicationRoutes } from './modules/applications/application.routes';
import { skillsRoutes } from './modules/skills/skills.routes';
import { careerRoutes } from './modules/career/career.routes';

async function start() {
  const fastify = await buildServer() as any;

  fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  fastify.register(candidateRoutes, { prefix: '/api/v1/candidates' });
  fastify.register(resumeRoutes, { prefix: '/api/v1/resumes' });
  fastify.register(jobsRoutes, { prefix: '/api/v1/jobs' });
  fastify.register(applicationRoutes, { prefix: '/api/v1/applications' });
  fastify.register(skillsRoutes, { prefix: '/api/v1/skills' });
  fastify.register(careerRoutes, { prefix: '/api/v1/career' });

  try {
    await prisma.$connect();
    fastify.log.info('Database connected');

    await redis.ping();
    fastify.log.info('Redis connected');

    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    fastify.log.info(`Server running on port ${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    fastify.log.info(`Received ${signal}, starting graceful shutdown...`);
    await fastify.close();
    await prisma.$disconnect();
    await redis.quit();
    fastify.log.info('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
