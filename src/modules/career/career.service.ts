import { NotFoundError } from '../../shared/errors';
import { prisma } from '../../infrastructure/db/prisma.client';

export async function getCareerPath(candidateId: string, targetRole?: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) throw new NotFoundError('Candidate not found');

  return {
    targetRole: targetRole ?? 'SDE-I',
    milestones: [] as { title: string; description: string; order: number }[],
  };
}

export async function getLearningPath(candidateId: string, skillGaps?: string[]) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) throw new NotFoundError('Candidate not found');

  return {
    skillGaps: skillGaps ?? [],
    resources: [] as { skill: string; title: string; url: string; type: string }[],
  };
}
