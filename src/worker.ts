import 'dotenv/config';
import { resumeParserWorker } from './infrastructure/queue/workers/resume-parser.worker';
import { prisma } from './infrastructure/db/prisma.client';
import { redis } from './infrastructure/redis/redis.client';

console.log('📦 Resume parser worker started');

process.on('SIGTERM', async () => {
  await resumeParserWorker.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await resumeParserWorker.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
