const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'smarthire-backend');
const files = {};

const subModules = [
  'skills', 'education', 'experience', 'career-intent', 'resume-sync', 'privacy'
];

subModules.forEach(mod => {
  const modDir = `src/modules/candidate-profile/sub-modules/${mod}`;
  files[`${modDir}/${mod}.types.ts`] = "export {};";
  files[`${modDir}/${mod}.validator.ts`] = "import { z } from 'zod';\nexport const DummyDto = z.object({});";
  files[`${modDir}/${mod}.repository.ts`] = `import { prisma } from '../../../../config/database';\nexport class ${capitalize(mod)}Repository {\n  async dummyOp(tx?: any) {\n    const db = tx || prisma;\n    return true;\n  }\n}`;
  files[`${modDir}/${mod}.service.ts`] = `import { ${capitalize(mod)}Repository } from './${mod}.repository';\nexport class ${capitalize(mod)}Service {\n  repo = new ${capitalize(mod)}Repository();\n  async dummyLogic() { return true; }\n}`;
  files[`${modDir}/${mod}.controller.ts`] = `import { Request, Response } from 'express';\nimport { ${capitalize(mod)}Service } from './${mod}.service';\nimport { sendResponse } from '../../../../shared/utils/apiResponse';\nconst service = new ${capitalize(mod)}Service();\nexport const dummyHandler = async (req: Request, res: Response) => {\n  const data = await service.dummyLogic();\n  sendResponse(res, 200, data);\n};`;
  files[`${modDir}/${mod}.routes.ts`] = `import { Router } from 'express';\nimport { validateMiddleware } from '../../../../middleware/validate.middleware';\nimport { dummyHandler } from './${mod}.controller';\nimport { asyncHandler } from '../../../../shared/utils/asyncHandler';\nexport const ${mod}Router = Router();\n${mod}Router.get('/', asyncHandler(dummyHandler));`;
});

// Overwrite specific ones
files['src/modules/candidate-profile/sub-modules/skills/skills.service.ts'] = `import { prisma } from '../../../../config/database';
import { NotFoundError } from '../../../../shared/errors/NotFoundError';
import { ConflictError } from '../../../../shared/errors/ConflictError';
import { ForbiddenError } from '../../../../shared/errors/ForbiddenError';
import { events } from '../../../../shared/utils/events';
import { PROFILE_EVENTS } from '../../candidate-profile.events';

export class SkillsService {
  async addSkillToProfile(profileId: string, dto: any, requestingUser: any) {
    const { skillId, proficiency, yearsOfExp } = dto;
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) throw new NotFoundError('Skill not found in catalog');
    const profile = await prisma.candidateProfile.findUnique({ where: { id: profileId } });
    if (profile?.userId !== requestingUser.userId && requestingUser.role !== 'ADMIN') throw new ForbiddenError('Permission denied');
    const duplicate = await prisma.candidateSkill.findUnique({ where: { profileId_skillId: { profileId, skillId } } });
    if (duplicate) throw new ConflictError('Skill already exists on profile');
    const cs = await prisma.candidateSkill.create({ data: { profileId, skillId, proficiency, yearsOfExp } });
    events.emit(PROFILE_EVENTS.SKILLS_UPDATED, { eventType: PROFILE_EVENTS.SKILLS_UPDATED, profileId, userId: profile!.userId, timestamp: new Date().toISOString(), correlationId: '', payload: dto });
    return cs;
  }
  async updateSkill(id: string, profileId: string, dto: any, requestingUser: any) {
    const cs = await prisma.candidateSkill.findFirst({ where: { id, profileId } });
    if (!cs) throw new ForbiddenError('Not your skill or does not exist');
    return prisma.candidateSkill.update({ where: { id }, data: dto });
  }
  async removeSkill(id: string, profileId: string, requestingUser: any) {
    const cs = await prisma.candidateSkill.findFirst({ where: { id, profileId } });
    if (!cs) throw new ForbiddenError('Not your skill');
    await prisma.candidateSkill.delete({ where: { id } });
  }
  async bulkUpsertSkills(profileId: string, skills: any[]) {
    return prisma.$transaction(async (tx) => {
      let count = 0;
      for (const s of skills) {
        await tx.candidateSkill.upsert({
          where: { profileId_skillId: { profileId, skillId: s.skillId } },
          update: { proficiency: s.proficiency },
          create: { profileId, skillId: s.skillId, proficiency: s.proficiency }
        });
        count++;
      }
      return count;
    });
  }
  async searchSkills(query: string, categoryId?: string, limit: number = 20) {
    return prisma.$queryRawUnsafe('SELECT * FROM skills WHERE similarity(name, $1) > 0.3 ORDER BY similarity DESC LIMIT $2', query, limit);
  }
}
`;

files['src/modules/candidate-profile/sub-modules/resume-sync/resume-sync.service.ts'] = `import { prisma } from '../../../../config/database';
import { UnauthorizedError } from '../../../../shared/errors/UnauthorizedError';
import { ForbiddenError } from '../../../../shared/errors/ForbiddenError';
import { events } from '../../../../shared/utils/events';
import { PROFILE_EVENTS } from '../../candidate-profile.events';
import crypto from 'crypto';
import { env } from '../../../../config/env';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: env.AWS_REGION, credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } });

export class ResumeSyncService {
  async initiateResumeUpload(profileId: string, dto: any) {
    const key = 'resumes/' + profileId + '/' + Date.now() + '-' + dto.fileName;
    const command = new PutObjectCommand({ Bucket: env.AWS_S3_BUCKET_NAME, Key: key, ContentType: dto.fileMimeType });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    await prisma.resumeVersion.updateMany({ where: { profileId }, data: { isActive: false }});
    const last = await prisma.resumeVersion.findFirst({ where: { profileId }, orderBy: { versionNumber: 'desc' }});
    const nextV = (last?.versionNumber || 0) + 1;

    const rv = await prisma.resumeVersion.create({
      data: {
        profileId, versionNumber: nextV, fileName: dto.fileName, fileMimeType: dto.fileMimeType,
        fileSizeBytes: dto.fileSizeBytes, storageKey: key, parseStatus: 'PENDING'
      }
    });
    return { uploadUrl, resumeVersionId: rv.id, storageKey: key, expiresAt: new Date(Date.now() + 900000) };
  }

  async handleParseWebhook(payload: any, hmacSignature: string, rawBody: string) {
    const expectedSig = crypto.createHmac("sha256", env.RESUME_PARSE_WEBHOOK_SECRET).update(rawBody).digest("hex");
    const providedSig = Buffer.from(hmacSignature, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (providedSig.length !== expectedBuf.length || !crypto.timingSafeEqual(providedSig, expectedBuf)) {
      throw new UnauthorizedError("Invalid webhook signature");
    }
    const rv = await prisma.resumeVersion.findFirst({ where: { parseJobId: payload.parseJobId } });
    if (!rv) return;
    if (rv.parseStatus === 'COMPLETED' || rv.parseStatus === 'USER_CONFIRMED') return;

    await prisma.resumeVersion.update({ where: { id: rv.id }, data: { parseStatus: 'COMPLETED', parsedData: payload.parsedData }});
    events.emit(PROFILE_EVENTS.RESUME_PARSED, { eventType: PROFILE_EVENTS.RESUME_PARSED, profileId: rv.profileId, userId: '', timestamp: '', correlationId: '', payload });
  }

  async confirmParsedResume(profileId: string, resumeVersionId: string, dto: any, requestingUser: any) {
    const rv = await prisma.resumeVersion.findFirst({ where: { id: resumeVersionId }});
    if (rv?.profileId !== profileId) throw new ForbiddenError();
    if (rv?.parseStatus !== 'COMPLETED') throw new Error('Wait for completion');

    await prisma.$transaction(async (tx) => {
      await tx.resumeVersion.update({ where: { id: resumeVersionId }, data: { userConfirmed: true, userConfirmedAt: new Date(), parseStatus: 'USER_CONFIRMED' }});
    });
    events.emit(PROFILE_EVENTS.RESUME_CONFIRMED, { eventType: PROFILE_EVENTS.RESUME_CONFIRMED, profileId, userId: requestingUser.userId, timestamp: '', correlationId: '', payload: dto });
  }
}
`;

files['src/modules/candidate-profile/sub-modules/privacy/privacy.service.ts'] = `import { prisma } from '../../../../config/database';
import { Queue } from 'bullmq';
import { env } from '../../../../config/env';
import { ForbiddenError } from '../../../../shared/errors/ForbiddenError';
import { events } from '../../../../shared/utils/events';
import { PROFILE_EVENTS } from '../../candidate-profile.events';

const gdprQueue = new Queue('gdpr-delete', { connection: { url: env.REDIS_URL }});

export class PrivacyService {
  async getPrivacySettings(profileId: string, userId: string) {
    return prisma.privacySettings.findUnique({ where: { profileId }});
  }
  async updatePrivacySettings(profileId: string, userId: string, dto: any) {
    const existing = await prisma.privacySettings.findUnique({ where: { profileId }});
    if (!existing) throw new ForbiddenError();
    if (dto.gdprConsentGiven && !existing.gdprConsentGiven) dto.gdprConsentAt = new Date();
    const updated = await prisma.privacySettings.update({ where: { profileId }, data: dto });
    events.emit(PROFILE_EVENTS.PRIVACY_CHANGED, { eventType: PROFILE_EVENTS.PRIVACY_CHANGED, profileId, userId, timestamp: '', correlationId: '', payload: dto });
    return updated;
  }
  async initiateGDPRDeletion(profileId: string, requestedByUserId: string) {
    const job = await gdprQueue.add('delete-profile', { profileId, requestedByUserId });
    events.emit(PROFILE_EVENTS.GDPR_DELETION_QUEUED, { eventType: PROFILE_EVENTS.GDPR_DELETION_QUEUED, profileId, userId: requestedByUserId, timestamp: '', correlationId: '', payload: {} });
    return { jobId: job.id };
  }
}
`;

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(baseDir, filename), content);
}

function capitalize(s) {
  if (typeof s !== 'string') return '';
  return s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

console.log('Script 4 finished');
