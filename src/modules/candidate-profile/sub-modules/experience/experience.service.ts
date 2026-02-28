import { prisma } from '../../../../config/database';
import { completenessQueue } from '../../../../jobs/profile-completeness.job';
import { ForbiddenError } from '../../../../shared/errors/ForbiddenError';

export class ExperienceService {
  async dummyLogic() { return true; }
  async addExperience(profileId: string, dto: any) {
    const doc = await prisma.workExperience.create({ data: { profileId, ...dto } });
    await completenessQueue.add('completeness', { profileId });
    return doc;
  }

  async updateExperience(id: string, profileId: string, dto: any) {
    const existing = await prisma.workExperience.findUnique({ where: { id } });
    if (!existing || existing.profileId !== profileId) throw new ForbiddenError('Not yours or does not exist');
    const doc = await prisma.workExperience.update({ where: { id }, data: dto });
    await completenessQueue.add('completeness', { profileId });
    return doc;
  }

  async deleteExperience(id: string, profileId: string) {
    const existing = await prisma.workExperience.findUnique({ where: { id } });
    if (!existing || existing.profileId !== profileId) throw new ForbiddenError('Not yours or does not exist');
    await prisma.workExperience.delete({ where: { id } });
    await completenessQueue.add('completeness', { profileId });
  }
}