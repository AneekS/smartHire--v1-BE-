import { ConflictError, NotFoundError, ForbiddenError } from '../../shared/errors';
import { prisma } from '../../infrastructure/db/prisma.client';

export async function apply(candidateId: string, jobId: string, resumeId: string) {
  const [job, resume] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId, status: 'ACTIVE' } }),
    prisma.resume.findFirst({ where: { id: resumeId, candidateId } }),
  ]);

  if (!job) throw new NotFoundError('Job not found');
  if (!resume) throw new NotFoundError('Resume not found');

  const existing = await prisma.application.findUnique({
    where: {
      candidateId_jobId: { candidateId, jobId },
    },
  });
  if (existing) throw new ConflictError('Already applied to this job');

  return prisma.application.create({
    data: {
      candidateId,
      jobId,
      resumeId,
    },
  });
}

export async function listByCandidate(candidateId: string) {
  return prisma.application.findMany({
    where: { candidateId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          status: true,
        },
      },
    },
    orderBy: { appliedAt: 'desc' },
  });
}
