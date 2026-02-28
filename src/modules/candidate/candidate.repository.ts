import { prisma } from '../../infrastructure/db/prisma.client';
import type { UpdateProfileInput } from './candidate.schema';

export async function getCandidateById(id: string) {
  return prisma.candidate.findUnique({
    where: { id },
    include: { profile: true },
  });
}

export async function updateProfile(candidateId: string, data: UpdateProfileInput) {
  return prisma.candidateProfile.upsert({
    where: { candidateId },
    update: data as any,
    create: {
      candidateId,
      fullName: data.fullName ?? 'Unknown',
      ...(data as any),
    },
  });
}

export async function getDashboardData(candidateId: string) {
  const [resumes, applications, profile] = await Promise.all([
    prisma.resume.findMany({
      where: { candidateId, isActive: true },
      orderBy: { version: 'desc' },
      take: 5,
    }),
    prisma.application.findMany({
      where: { candidateId },
      include: { job: { select: { id: true, title: true, company: true, status: true } } },
      orderBy: { appliedAt: 'desc' },
      take: 20,
    }),
    prisma.candidateProfile.findUnique({
      where: { candidateId },
    }),
  ]);

  const activeResume = resumes[0];
  return {
    profile,
    activeResume,
    resumes,
    applications,
    atsScore: activeResume?.atsScore ?? null,
  };
}
