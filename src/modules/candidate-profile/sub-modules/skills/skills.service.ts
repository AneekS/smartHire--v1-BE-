import { prisma } from '../../../../config/database';
import { NotFoundError } from '../../../../shared/errors/NotFoundError';
import { ConflictError } from '../../../../shared/errors/ConflictError';
import { ForbiddenError } from '../../../../shared/errors/ForbiddenError';
import { events } from '../../../../shared/utils/events';
import { PROFILE_EVENTS } from '../../candidate-profile.events';
import { randomUUID } from 'crypto';
import { completenessQueue } from '../../../../jobs/profile-completeness.job';
import { Prisma } from '@prisma/client';
import { redis } from '../../../../shared/redis';

export class SkillsService {
  async dummyLogic() { return true; }
  async addSkill(profileId: string, dto: any, requestingUser: any) {
    const { skillId, proficiency, yearsOfExp } = dto;
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) throw new NotFoundError('Skill not found in catalog');
    const profile = await prisma.candidateProfile.findUnique({ where: { id: profileId } });
    if (profile?.userId !== requestingUser.userId && requestingUser.role !== 'ADMIN') throw new ForbiddenError('Permission denied');
    const duplicate = await prisma.candidateSkill.findUnique({ where: { profileId_skillId: { profileId, skillId } } });
    if (duplicate) throw new ConflictError('Skill already exists on profile');

    const cs = await prisma.candidateSkill.create({ data: { profileId, skillId, proficiency, yearsOfExp } });

    events.emit(PROFILE_EVENTS.SKILLS_UPDATED, {
      eventType: PROFILE_EVENTS.SKILLS_UPDATED,
      profileId,
      userId: profile!.userId,
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
      payload: { skillId }
    });

    await completenessQueue.add('completeness', { profileId });
    return cs;
  }

  async deleteSkill(profileId: string, id: string, requestingUser: any) {
    const cs = await prisma.candidateSkill.findFirst({ where: { id, profileId } });
    if (!cs) throw new ForbiddenError('Not your skill');
    await prisma.candidateSkill.delete({ where: { id } });

    await completenessQueue.add('completeness', { profileId });
  }

  async bulkUpsertSkills(profileId: string, skills: any[]) {
    const output = await prisma.$transaction(async (tx) => {
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

    await completenessQueue.add('completeness', { profileId });
    return output;
  }

  async searchSkills(query: string, limit: number = 20) {
    const cacheKey = `skills:search:${query}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const results = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, name, category,
             similarity(name, ${query}) AS score
      FROM   "Skill"
      WHERE  similarity(name, ${query}) > 0.3
      ORDER  BY similarity(name, ${query}) DESC
      LIMIT  ${limit}
    `);

    await redis.setex(cacheKey, 300, JSON.stringify(results));
    return results;
  }
}
