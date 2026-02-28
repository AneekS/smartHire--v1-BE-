import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { ConflictError } from '../../shared/errors/ConflictError';
import { CursorPagination } from '../../shared/utils/pagination';

export class CandidateProfileRepository {
  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return await db.candidateProfile.create({ data });
  }

  async findById(id: string, tx?: any) {
    const db = tx || prisma;
    const profile = await db.candidateProfile.findFirst({ where: { id, isDeleted: false } });
    if (!profile) throw new NotFoundError('Profile not found');
    return profile;
  }

  async findByUserId(userId: string, tx?: any) {
    const db = tx || prisma;
    return await db.candidateProfile.findFirst({ where: { userId, isDeleted: false } });
  }

  async update(id: string, data: any, expectedVersion: number, tx?: any) {
    const db = tx || prisma;
    const result = await db.candidateProfile.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } }
    });
    if (result.count === 0) throw new ConflictError('Profile was modified by another request. Refresh and retry.');
    return await this.findById(id, tx);
  }

  async softDelete(id: string, tx?: any) {
    const db = tx || prisma;
    await db.candidateProfile.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async findForRecruiter(filters: any, pagination: CursorPagination) {
    const { limit, cursor } = pagination;
    const where: any = {
      isDeleted: false,
      privacySettings: { profileVisibility: { not: 'PRIVATE' } },
      ...(filters.skills?.length ? {
        skills: { some: { skill: { name: { in: filters.skills } } } }
      } : {}),
      ...(filters.location ? { locationCity: { contains: filters.location, mode: 'insensitive' } } : {}),
      ...(cursor ? { id: { gt: cursor } } : {}),
    };

    // Use read replica in real world, but for now we fall back to prisma
    const items = await prisma.candidateProfile.findMany({
      where, take: limit + 1,
      include: { skills: { include: { skill: true } }, education: true },
      orderBy: { id: 'asc' },
    });
    const hasNextPage = items.length > limit;

    return {
      items: items.slice(0, limit), // toRecruiterView mapped in service
      meta: {
        limit, hasNextPage,
        nextCursor: hasNextPage ? items[limit - 1].id : null
      }
    };
  }
}