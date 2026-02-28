import { prisma } from '../../infrastructure/db/prisma.client';
import type { ParseStatus } from '@prisma/client';

export async function createResume(data: {
  candidateId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  fileHash: string | null;
  version: number;
  parseStatus: ParseStatus;
}) {
  return prisma.resume.create({
    data: {
      ...data,
      extractedSkills: [],
    },
  });
}

export async function getResumeById(id: string, candidateId?: string) {
  const where: { id: string; candidateId?: string } = { id };
  if (candidateId) where.candidateId = candidateId;
  return prisma.resume.findFirst({
    where,
    include: { suggestions: true },
  });
}

export async function getActiveResume(candidateId: string) {
  return prisma.resume.findFirst({
    where: { candidateId, isActive: true },
    orderBy: { version: 'desc' },
  });
}

export async function deactivateResumes(candidateId: string) {
  return prisma.resume.updateMany({
    where: { candidateId, isActive: true },
    data: { isActive: false },
  });
}

export async function findLastVersion(candidateId: string) {
  return prisma.resume.findFirst({
    where: { candidateId },
    orderBy: { version: 'desc' },
  });
}

export async function findCompletedByHash(candidateId: string, fileHash: string) {
  return prisma.resume.findFirst({
    where: {
      candidateId,
      fileHash,
      parseStatus: 'COMPLETED',
    },
  });
}

export async function updateParseStatus(
  id: string,
  status: ParseStatus,
  error?: string | null,
  data?: {
    parsedData?: Record<string, unknown>;
    extractedSkills?: string[];
    atsScore?: number;
    yearsExperience?: number;
    parsedAt?: Date;
  }
) {
  return prisma.resume.update({
    where: { id },
    data: {
      parseStatus: status,
      parseError: error ?? undefined,
      ...(data && {
        parsedData: data.parsedData as any,
        extractedSkills: data.extractedSkills,
        atsScore: data.atsScore,
        yearsExperience: data.yearsExperience,
        parsedAt: data.parsedAt,
      }),
    },
  });
}
