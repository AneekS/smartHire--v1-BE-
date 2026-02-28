import { CandidateProfileRepository } from './candidate-profile.repository';
import { ConflictError } from '../../shared/errors/ConflictError';
import { ForbiddenError } from '../../shared/errors/ForbiddenError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { prisma } from '../../config/database';
import { PROFILE_EVENTS } from './candidate-profile.events';
import { events } from '../../shared/utils/events';

const repo = new CandidateProfileRepository();

export function toRecruiterView(p: any) {
  if (!p) return p;
  const { phoneNumber, phoneCountryCode, locationLatitude, locationLongitude, ...rest } = p;
  if (rest.bio && rest.bio.length > 200) {
    rest.bio = rest.bio.substring(0, 200) + '...';
  }
  return rest;
}

export function toOwnerView(p: any) {
  return p;
}

function computeBasicScore(dto: any) {
  let basic = 0;
  if (dto.fullName) basic += 5;
  if (dto.phoneNumber) basic += 5;
  if (dto.headline) basic += 5;
  if (dto.bio) basic += 5;
  if (dto.locationCity) basic += 5;
  return basic;
}

export class CandidateProfileService {
  async createProfile(userId: string, dto: any, requestId: string) {
    const existing = await repo.findByUserId(userId);
    if (existing) throw new ConflictError('Profile already exists for this user');

    const basicScore = computeBasicScore(dto);
    const result = await prisma.$transaction(async tx => {
      const p = await tx.candidateProfile.create({
        data: { ...dto, userId, completenessScore: basicScore }
      });
      await tx.privacySettings.create({ data: { profileId: p.id } });
      await tx.careerIntent.create({ data: { profileId: p.id } });
      return p;
    });

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
    // Need full profile with settings to check privacy
    const p = await prisma.candidateProfile.findUnique({
      where: { id: profileId },
      include: { privacySettings: true }
    });
    if (!p || p.isDeleted) throw new NotFoundError('Profile not found');

    const isOwner = p.userId === requestingUserId;
    const isAdmin = role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      const visibility = (p as any).privacySettings?.profileVisibility ?? 'PRIVATE';
      if (visibility === 'PRIVATE') {
        throw new ForbiddenError('Profile not found');
      }
      if (visibility === 'APPLIED_ONLY') {
        const app = await (prisma as any).application.findFirst({
          where: { candidateProfileId: profileId, recruiterId: requestingUserId }
        });
        if (!app) throw new ForbiddenError('Profile not available');
      }
      return toRecruiterView(p);
    }
    return toOwnerView(p);
  }

  async updateProfile(profileId: string, userId: string, dto: any, requestId: string) {
    const profile = await repo.findById(profileId);
    if (profile.userId !== userId) throw new ForbiddenError('You do not have permission to modify this profile');

    const merged = { ...profile, ...dto };
    const { score, breakdown } = this.computeCompleteness(merged);

    const updated = await repo.update(
      profileId,
      { ...dto, completenessScore: score, completenessBreakdown: breakdown },
      dto.version
    );

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

  computeCompleteness(profile: any): { score: number; breakdown: Record<string, number> } {
    const b: Record<string, number> = {};
    let basic = 0;
    if (profile.fullName) basic += 5;
    if (profile.phoneNumber) basic += 5;
    if (profile.headline) basic += 5;
    if (profile.bio) basic += 5;
    if (profile.locationCity) basic += 5;
    b.basic = basic;
    b.education = (profile.education?.length ?? 0) >= 1 ? 20 : 0;
    const exp = profile.experience ?? [];
    b.experience = exp.length >= 1
      ? (exp.some((e: any) => e.description) ? 25 : 15) : 0;
    const sk = profile.skills?.length ?? 0;
    b.skills = sk >= 6 ? 15 : sk >= 3 ? 10 : sk >= 1 ? 5 : 0;
    let intent = 0;
    if (profile.careerIntent?.preferredRoles?.length > 0) intent += 5;
    if (profile.careerIntent?.availability) intent += 3;
    if (profile.careerIntent?.salaryMinMonthly) intent += 2;
    b.careerIntent = intent;
    b.resume = profile.resumeVersions?.some((r: any) => r.userConfirmed) ? 5 : 0;
    return { score: Object.values(b).reduce((a, c) => a + c, 0), breakdown: b };
  }
}