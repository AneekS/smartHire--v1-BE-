import { prisma } from '../../../../config/database';
export class ResumeSyncRepository {
  async dummyOp(tx?: any) {
    const db = tx || prisma;
    return true;
  }
}