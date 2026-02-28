import { prisma } from '../../infrastructure/db/prisma.client';
import { NotFoundError } from '../../shared/errors';

export async function getGapAnalysis(candidateId: string, roleProfile?: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { skillScores: { include: { skill: true } } },
  });
  if (!candidate) throw new NotFoundError('Candidate not found');

  const candidateSkills = candidate.skillScores.map((cs) => cs.skill.name);
  return {
    candidateSkills,
    roleProfile: roleProfile ?? null,
    gaps: [] as string[],
    recommendations: [] as string[],
  };
}
