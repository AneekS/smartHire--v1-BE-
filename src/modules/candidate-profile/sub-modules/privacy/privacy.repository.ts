import { prisma } from '../../../../config/database';
export class PrivacyRepository {
  async dummyOp(tx?: any) {
    const db = tx || prisma;
    return true;
  }
}