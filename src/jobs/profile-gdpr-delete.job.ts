import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { prisma } from '../config/database';

import { redis } from '../shared/redis';

export const gdprDeleteWorker = new Worker('gdpr-delete', async job => {
  const { profileId } = job.data;
  await prisma.$transaction(async (tx) => {
    await tx.candidateSkill.deleteMany({ where: { profileId } });
    await tx.education.deleteMany({ where: { profileId } });
    await tx.workExperience.deleteMany({ where: { profileId } });
    await tx.careerIntent.delete({ where: { profileId } }).catch(() => { });
    await tx.resumeVersion.deleteMany({ where: { profileId } });
    await tx.privacySettings.delete({ where: { profileId } }).catch(() => { });

    await tx.candidateProfile.update({
      where: { id: profileId },
      data: {
        fullName: "Deleted User",
        phoneCountryCode: null,
        phoneNumber: null,
        bio: null,
        avatarUrl: null,
        locationCity: null,
        locationLatitude: null,
        locationLongitude: null,
        isDeleted: true,
        deletedAt: new Date()
      }
    });
  });
}, { connection: redis });
