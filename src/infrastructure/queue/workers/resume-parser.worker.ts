import { Worker } from 'bullmq';
import { redis } from '../../redis/redis.client';
import { runParserPipeline } from '../../../modules/parser/parser.pipeline';

export const resumeParserWorker = new Worker(
  'resume-parsing',
  async (job) => {
    const { resumeId } = job.data as { resumeId: string };
    await runParserPipeline(resumeId);
  },
  {
    connection: redis,
    concurrency: 3,
    limiter: {
      max: 60,
      duration: 60_000,
    },
  }
);

resumeParserWorker.on('completed', (job) => {
  console.log(`Resume parsed: ${job?.data?.resumeId}`);
});

resumeParserWorker.on('failed', (job, err) => {
  console.error(`Resume parse failed: ${job?.data?.resumeId}`, err);
});
