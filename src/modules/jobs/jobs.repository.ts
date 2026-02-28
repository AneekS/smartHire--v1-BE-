import { prisma } from '../../infrastructure/db/prisma.client';
import type { SearchQuery } from './jobs.schema';

export async function searchJobs(query: SearchQuery) {
  const { q, role, location, experienceMin, experienceMax, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: any = {
    status: 'ACTIVE',
  };

  if (experienceMin != null) {
    where.experienceMax = { gte: experienceMin };
  }
  if (experienceMax != null) {
    where.experienceMin = { lte: experienceMax };
  }
  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }
  if (role) {
    where.title = { contains: role, mode: 'insensitive' };
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { company: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: { requiredSkills: { include: { skill: true } } },
    }),
    prisma.job.count({ where }),
  ]);

  return { jobs, total };
}

export async function getJobById(id: string) {
  return prisma.job.findUnique({
    where: { id, status: 'ACTIVE' },
    include: { requiredSkills: { include: { skill: true } } },
  });
}

export async function getRecommendedJobs(candidateId: string, limit: number = 10) {
  const candidateSkills = await prisma.candidateSkill.findMany({
    where: { candidateId },
    include: { skill: true },
  });
  const skillIds = candidateSkills.map((cs) => cs.skillId);
  const skillNames = candidateSkills.map((cs) => cs.skill.name.toLowerCase());

  const jobs = await prisma.job.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { requiredSkills: { some: { skillId: { in: skillIds } } } },
        {
          keywords: {
            hasSome: skillNames.length > 0 ? skillNames : ['developer'],
          },
        },
      ],
    },
    take: limit,
    orderBy: { publishedAt: 'desc' },
    include: { requiredSkills: { include: { skill: true } } },
  });

  return jobs;
}
