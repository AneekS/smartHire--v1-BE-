import { prisma } from '../../../../config/database';
export class ExperienceRepository {
  async dummyOp(tx?: any) {
    const db = tx || prisma;
    return true;
  }
}