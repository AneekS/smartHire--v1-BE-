import { prisma } from '../../../../config/database';
export class EducationRepository {
  async dummyOp(tx?: any) {
    const db = tx || prisma;
    return true;
  }
}