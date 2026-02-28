import { Worker } from 'bullmq';
import { redis } from '../shared/redis';
import { ResumeSyncService } from '../modules/candidate-profile/sub-modules/resume-sync/resume-sync.service';
import { logger } from '../shared/utils/logger';

const resumeSyncService = new ResumeSyncService();

export const resumeParserWorker = new Worker(
    'resume-parse-webhook',
    async (job) => {
        const { profileId, storageKey, parsedData, correlationId } = job.data;
        logger.info('Processing parse webhook', { jobId: job.id, profileId, correlationId });
        await resumeSyncService.handleParseWebhook({ profileId, storageKey, parsedData, correlationId });
    },
    { connection: redis, concurrency: 3 }
);
