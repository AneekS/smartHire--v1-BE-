import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { prisma } from '../config/database';
// Completeness recompute job
import { redis } from '../shared/redis';
export const completenessQueue = new Queue('completeness', { connection: redis });
export const completenessWorker = new Worker('completeness', async job => {
  // Recompute logic
}, { connection: redis });
