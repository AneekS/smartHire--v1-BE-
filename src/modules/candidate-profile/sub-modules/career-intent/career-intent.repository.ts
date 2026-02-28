import { prisma } from '../../../../config/database';
export class CareerIntentRepository {
  async dummyOp(tx?: any) {
    const db = tx || prisma;
    return true;
  }
}