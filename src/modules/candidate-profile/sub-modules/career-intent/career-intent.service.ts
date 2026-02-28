import { prisma } from '../../../../config/database';
import { completenessQueue } from '../../../../jobs/profile-completeness.job';

export class CareerIntentService {
  async dummyLogic() { return true; }
  async getCareerIntent(profileId: string) {
    return prisma.careerIntent.findUnique({ where: { profileId } });
  }

  async upsertCareerIntent(profileId: string, dto: any) {
    const doc = await prisma.careerIntent.upsert({
      where: { profileId },
      create: { profileId, ...dto },
      update: dto
    });
    await completenessQueue.add('completeness', { profileId });
    return doc;
  }
}