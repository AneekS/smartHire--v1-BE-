const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'smarthire-backend');
const files = {};

files['src/modules/candidate-profile/candidate-profile.types.ts'] = `import { CandidateProfile, ProfileVisibility, JobType, AvailabilityStatus } from '@prisma/client';
export type CompleteProfileData = any; // simplified for script
export interface ProfileResponse extends CandidateProfile {}`;

files['src/modules/candidate-profile/candidate-profile.validator.ts'] = `import { z } from 'zod';

export const CreateProfileDto = z.object({
  fullName: z.string().trim().min(2).max(120),
  phoneCountryCode: z.string().trim().max(6).optional(),
  phoneNumber: z.string().trim().max(20).optional(),
  headline: z.string().trim().max(220).optional(),
  bio: z.string().trim().max(2000).optional(),
  locationCity: z.string().trim().max(100).optional(),
  locationState: z.string().trim().max(100).optional(),
  locationCountry: z.string().trim().length(2).default('IN')
});

export const UpdateProfileDto = CreateProfileDto.partial().extend({
  version: z.number().int().nonnegative()
});

export const RecruiterSearchDto = z.object({
  skillIds: z.array(z.string().uuid()).max(10).optional(),
  locations: z.array(z.string().trim()).max(5).optional(),
  availability: z.enum(['ACTIVELY_LOOKING', 'OPEN_TO_OFFERS', 'NOT_LOOKING']).optional(),
  minCompleteness: z.number().int().min(0).max(100).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20)
});`;

files['src/modules/candidate-profile/candidate-profile.repository.ts'] = `import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ConflictError } from '../../shared/errors/ConflictError';
import { CursorPagination } from '../../shared/utils/pagination';

export class CandidateProfileRepository {
  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return await db.candidateProfile.create({ data });
  }

  async findById(id: string, tx?: any) {
    const db = tx || prisma;
    const profile = await db.candidateProfile.findFirst({ where: { id, isDeleted: false } });
    if (!profile) throw new NotFoundError('Profile not found');
    return profile;
  }

  async findByUserId(userId: string, tx?: any) {
    const db = tx || prisma;
    return await db.candidateProfile.findFirst({ where: { userId, isDeleted: false } });
  }

  async update(id: string, data: any, expectedVersion: number, tx?: any) {
    const db = tx || prisma;
    const result = await db.candidateProfile.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } }
    });
    if (result.count === 0) throw new ConflictError('Profile was modified by another request. Refresh and retry.');
    return await this.findById(id, tx);
  }

  async softDelete(id: string, tx?: any) {
    const db = tx || prisma;
    await db.candidateProfile.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async findForRecruiter(filters: any, pagination: CursorPagination) {
    // simplified for script size
    return { items: [], meta: { limit: pagination.limit, hasNextPage: false, nextCursor: null } };
  }
}`;

files['src/modules/candidate-profile/candidate-profile.service.ts'] = `import { CandidateProfileRepository } from './candidate-profile.repository';
import { ConflictError } from '../../shared/errors/ConflictError';
import { ForbiddenError } from '../../shared/errors/ForbiddenError';
import { prisma } from '../../config/database';
import { PROFILE_EVENTS } from './candidate-profile.events';
import { events } from '../../shared/utils/events';

const repo = new CandidateProfileRepository();

export class CandidateProfileService {
  async createProfile(userId: string, dto: any, requestId: string) {
    const existing = await repo.findByUserId(userId);
    if (existing) throw new ConflictError('Profile already exists for this user');

    const result = await prisma.$transaction(async (tx) => {
      const p = await tx.candidateProfile.create({ data: { ...dto, userId } });
      await tx.privacySettings.create({ data: { profileId: p.id } });
      await tx.careerIntent.create({ data: { profileId: p.id } });
      return p;
    });

    result.completenessScore = this.computeCompleteness(result).score;
    await repo.update(result.id, { completenessScore: result.completenessScore }, result.version);

    events.emit(PROFILE_EVENTS.PROFILE_CREATED, {
      eventType: PROFILE_EVENTS.PROFILE_CREATED,
      profileId: result.id,
      userId,
      timestamp: new Date().toISOString(),
      correlationId: requestId,
      payload: { ...dto }
    });

    const { version, deletedAt, isDeleted, ...safe } = result as any;
    return safe;
  }

  async getProfileById(profileId: string, requestingUserId: string, role: string) {
    const p = await repo.findById(profileId);
    if (p.userId !== requestingUserId && role !== 'ADMIN') {
      const privacy = await prisma.privacySettings.findUnique({ where: { profileId } });
      if (privacy?.profileVisibility === 'PRIVATE') throw new ForbiddenError();
    }
    return p;
  }

  async updateProfile(profileId: string, userId: string, dto: any, requestId: string) {
    const profile = await repo.findById(profileId);
    if (profile.userId !== userId) throw new ForbiddenError('You do not have permission to modify this profile');

    const updated = await repo.update(profileId, dto, dto.version);
    updated.completenessScore = this.computeCompleteness(updated).score;
    // update score again
    await repo.update(profileId, { completenessScore: updated.completenessScore }, updated.version);

    events.emit(PROFILE_EVENTS.PROFILE_UPDATED, {
      eventType: PROFILE_EVENTS.PROFILE_UPDATED,
      profileId,
      userId,
      timestamp: new Date().toISOString(),
      correlationId: requestId,
      payload: { before: profile, after: updated }
    });
    return updated;
  }

  async softDeleteProfile(profileId: string, actorId: string, requestId: string) {
    const profile = await repo.findById(profileId);
    if (profile.userId !== actorId) throw new ForbiddenError('You do not have permission to modify this profile');

    await repo.softDelete(profileId);
    events.emit(PROFILE_EVENTS.PROFILE_DELETED, {
      eventType: PROFILE_EVENTS.PROFILE_DELETED,
      profileId,
      userId: actorId,
      timestamp: new Date().toISOString(),
      correlationId: requestId,
      payload: {}
    });
  }

  computeCompleteness(profile: any) {
    let score = 0;
    const breakdown: Record<string, number> = {};
    if (profile.fullName && profile.phoneCountryCode && profile.headline && profile.bio && profile.locationCity) {
      score += 25; breakdown.basic = 25;
    }
    return { score, breakdown };
  }
}`;

files['src/modules/candidate-profile/candidate-profile.controller.ts'] = `import { Request, Response } from 'express';
import { CandidateProfileService } from './candidate-profile.service';
import { sendResponse } from '../../shared/utils/apiResponse';
const service = new CandidateProfileService();
export const createProfile = async (req: Request, res: Response) => {
  const data = await service.createProfile(req.user!.userId, req.body, req.id!);
  sendResponse(res, 201, data);
};
export const getMyProfile = async (req: Request, res: Response) => {
  const data = await service.getProfileById('my-id', req.user!.userId, req.user!.role); // placeholder fix
  sendResponse(res, 200, data);
};
export const getProfileById = async (req: Request, res: Response) => {
  const data = await service.getProfileById(req.params.profileId, req.user!.userId, req.user!.role);
  sendResponse(res, 200, data);
};
export const updateProfile = async (req: Request, res: Response) => {
  const data = await service.updateProfile('my-id', req.user!.userId, req.body, req.id!);
  sendResponse(res, 200, data);
};
export const softDeleteProfile = async (req: Request, res: Response) => {
  await service.softDeleteProfile('my-id', req.user!.userId, req.id!);
  sendResponse(res, 204, {});
};`;

files['src/modules/candidate-profile/candidate-profile.routes.ts'] = `import { Router } from 'express';
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import * as controller from './candidate-profile.controller';
import { CreateProfileDto, UpdateProfileDto } from './candidate-profile.validator';

export const candidateProfileRouter = Router();

candidateProfileRouter.post('/', rateLimitMiddleware('candidate-api', 5, 60), validateMiddleware(CreateProfileDto), asyncHandler(controller.createProfile));
candidateProfileRouter.get('/', rateLimitMiddleware('candidate-api', 100, 60), asyncHandler(controller.getMyProfile));
candidateProfileRouter.get('/:profileId', rateLimitMiddleware('candidate-api', 100, 60), rbacMiddleware(["RECRUITER", "ADMIN"]), asyncHandler(controller.getProfileById));
candidateProfileRouter.patch('/', rateLimitMiddleware('candidate-api', 30, 60), validateMiddleware(UpdateProfileDto), asyncHandler(controller.updateProfile));
candidateProfileRouter.delete('/', rateLimitMiddleware('candidate-api', 5, 60), asyncHandler(controller.softDeleteProfile));
`;

for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(baseDir, filename), content);
}
console.log('Script 3 finished');
