import { Queue } from 'bullmq';
import { redis } from '../../redis/redis.client';

export const resumeParsingQueue = new Queue('resume-parsing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
