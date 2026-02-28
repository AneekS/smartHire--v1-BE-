import { prisma } from '../../../../config/database';
import { UnauthorizedError } from '../../../../shared/errors/UnauthorizedError';
import { ForbiddenError } from '../../../../shared/errors/ForbiddenError';
import { events } from '../../../../shared/utils/events';
import { PROFILE_EVENTS } from '../../candidate-profile.events';
import crypto, { randomUUID } from 'crypto';
import { env } from '../../../../config/env';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { completenessQueue } from '../../../../jobs/profile-completeness.job';

const s3 = new S3Client({ region: env.AWS_REGION });

export class ResumeSyncService {
  async dummyLogic() { return true; }
  async initiateResumeUpload(profileId: string, extension: string) {
    const nextVersion = await prisma.resumeVersion.count({ where: { profileId } }) + 1;
    const key = `resumes/${profileId}/${Date.now()}-v${nextVersion}${extension}`;
    const command = new PutObjectCommand({ Bucket: env.AWS_S3_BUCKET_NAME, Key: key });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    const rv = await prisma.$transaction(async tx => {
      await tx.resumeVersion.updateMany({
        where: { profileId, isActive: true },
        data: { isActive: false }
      });
      return await tx.resumeVersion.create({
        data: {
          profileId,
          versionNumber: nextVersion,
          storageKey: key,
          isActive: true,
          parseStatus: 'PENDING',
          fileName: `v${nextVersion}${extension}`,
          fileMimeType: extension === '.pdf' ? 'application/pdf' : 'application/octet-stream',
          fileSizeBytes: 0
        }
      });
    });

    return { uploadUrl, resumeVersionId: rv.id, storageKey: key };
  }

  async handleParseWebhook(data: any) {
    const { profileId, storageKey, parsedData, correlationId } = data;
    const rv = await prisma.resumeVersion.findFirst({ where: { profileId, storageKey } });
    if (!rv) return;

    await prisma.resumeVersion.update({
      where: { id: rv.id },
      data: { parseStatus: 'COMPLETED', parsedData }
    });

    const profile = await prisma.candidateProfile.findUnique({ where: { id: profileId } });

    events.emit(PROFILE_EVENTS.RESUME_PARSED, {
      eventType: PROFILE_EVENTS.RESUME_PARSED,
      profileId,
      userId: profile?.userId || '',
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? randomUUID(),
      payload: { storageKey }
    });
  }

  async confirmParsedResume(profileId: string, resumeVersionId: string, requestingUser: any) {
    const rv = await prisma.resumeVersion.findUnique({ where: { id: resumeVersionId } });
    if (rv?.profileId !== profileId) throw new ForbiddenError();

    await prisma.$transaction(async tx => {
      await tx.resumeVersion.update({
        where: { id: resumeVersionId },
        data: { userConfirmed: true, userConfirmedAt: new Date(), parseStatus: 'USER_CONFIRMED' }
      });
    });

    await completenessQueue.add('completeness', { profileId });

    events.emit(PROFILE_EVENTS.RESUME_CONFIRMED, {
      eventType: PROFILE_EVENTS.RESUME_CONFIRMED,
      profileId,
      userId: requestingUser.userId,
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
      payload: { resumeVersionId }
    });
  }
}
