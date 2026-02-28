import { prisma } from '../../../../config/database';
import { Queue } from 'bullmq';
import { env } from '../../../../config/env';
import { ForbiddenError } from '../../../../shared/errors/ForbiddenError';
import { events } from '../../../../shared/utils/events';
import { PROFILE_EVENTS } from '../../candidate-profile.events';
import { redis } from '../../../../shared/redis';
import { randomUUID } from 'crypto';

const gdprQueue = new Queue('gdpr-delete', { connection: redis });

export class PrivacyService {
  async dummyLogic() { return true; }
  async getPrivacySettings(profileId: string) {
    let settings = await prisma.privacySettings.findUnique({ where: { profileId } });
    if (!settings) {
      settings = await prisma.privacySettings.create({
        data: { profileId }
      });
    }
    return settings;
  }

  async updatePrivacySettings(profileId: string, userId: string, dto: any, correlationId?: string) {
    if (dto.gdprConsentGiven) {
      const existing = await this.getPrivacySettings(profileId);
      if (!existing.gdprConsentGiven) dto.gdprConsentAt = new Date();
    }
    const updated = await prisma.privacySettings.upsert({
      where: { profileId },
      create: { profileId, ...dto },
      update: dto
    });

    events.emit(PROFILE_EVENTS.PRIVACY_CHANGED, {
      eventType: PROFILE_EVENTS.PRIVACY_CHANGED,
      profileId,
      userId,
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? randomUUID(),
      payload: dto
    });
    return updated;
  }

  async initiateGDPRDeletion(profileId: string, requestedByUserId: string, correlationId?: string) {
    const job = await gdprQueue.add('delete-profile', { profileId, requestedByUserId });

    events.emit(PROFILE_EVENTS.GDPR_DELETION_QUEUED, {
      eventType: PROFILE_EVENTS.GDPR_DELETION_QUEUED,
      profileId,
      userId: requestedByUserId,
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? randomUUID(),
      payload: { jobId: job.id }
    });
    return { jobId: job.id };
  }
}
