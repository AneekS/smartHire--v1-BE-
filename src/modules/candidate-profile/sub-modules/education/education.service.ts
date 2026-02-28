import { prisma } from '../../../../config/database';
import { completenessQueue } from '../../../../jobs/profile-completeness.job';
import { ForbiddenError } from '../../../../shared/errors/ForbiddenError';

export class EducationService {
  async dummyLogic() { return true; }
  async addEducation(profileId: string, dto: any) {
    const doc = await prisma.education.create({ data: { profileId, ...dto } });
    await completenessQueue.add('completeness', { profileId });
    return doc;
  }

  async updateEducation(id: string, profileId: string, dto: any) {
    const existing = await prisma.education.findUnique({ where: { id } });
    if (!existing || existing.profileId !== profileId) throw new ForbiddenError('Not yours or does not exist');
    const doc = await prisma.education.update({ where: { id }, data: dto });
    await completenessQueue.add('completeness', { profileId });
    return doc;
  }

  async deleteEducation(id: string, profileId: string) {
    const existing = await prisma.education.findUnique({ where: { id } });
    if (!existing || existing.profileId !== profileId) throw new ForbiddenError('Not yours or does not exist');
    await prisma.education.delete({ where: { id } });
    await completenessQueue.add('completeness', { profileId });
  }
}