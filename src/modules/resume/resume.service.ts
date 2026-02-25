import { createHash } from 'crypto';
import { ValidationError, NotFoundError } from '../../shared/errors';
import { prisma } from '../../infrastructure/db/prisma.client';
import { uploadResume as s3Upload } from '../../infrastructure/storage/s3.client';
import { MAX_RESUME_FILE_SIZE_BYTES, ALLOWED_RESUME_MIMES } from '../../config/constants';
import { resumeParsingQueue } from '../../infrastructure/queue/queues/resume.queue';
import * as resumeRepo from './resume.repository';

export interface UploadInput {
  buffer: Buffer;
  fileName: string;
  mimetype: string;
  candidateId: string;
}

async function validateFileMime(buffer: Buffer): Promise<void> {
  const { fileTypeFromBuffer } = await import('file-type');
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !ALLOWED_RESUME_MIMES.includes(type.mime as any)) {
    throw new ValidationError(
      `Invalid file type: ${type?.mime ?? 'unknown'}. Only PDF and DOCX are allowed.`
    );
  }
}

export async function upload(input: UploadInput) {
  if (input.buffer.length > MAX_RESUME_FILE_SIZE_BYTES) {
    throw new ValidationError(`File size exceeds ${MAX_RESUME_FILE_SIZE_BYTES / 1024 / 1024}MB`);
  }

  await validateFileMime(input.buffer);

  const fileHash = createHash('sha256').update(input.buffer).digest('hex');

  const existing = await resumeRepo.findCompletedByHash(input.candidateId, fileHash);
  if (existing) {
    return {
      resumeId: existing.id,
      version: existing.version,
      parseStatus: 'COMPLETED',
      cached: true,
      message: 'This resume was previously uploaded and parsed.',
    };
  }

  await resumeRepo.deactivateResumes(input.candidateId);
  const lastResume = await resumeRepo.findLastVersion(input.candidateId);
  const newVersion = (lastResume?.version ?? 0) + 1;

  const fileType = input.fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
  const contentType =
    fileType === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const fileUrl = await s3Upload(
    input.buffer,
    input.candidateId,
    input.fileName,
    contentType
  );

  const resume = await resumeRepo.createResume({
    candidateId: input.candidateId,
    fileName: input.fileName,
    fileUrl,
    fileType,
    fileSize: input.buffer.length,
    fileHash,
    version: newVersion,
    parseStatus: 'PENDING',
  });

  await resumeParsingQueue.add('parse', { resumeId: resume.id });

  return {
    resumeId: resume.id,
    version: newVersion,
    parseStatus: 'PENDING',
  };
}

export async function getResume(id: string, candidateId: string) {
  const resume = await resumeRepo.getResumeById(id, candidateId);
  if (!resume) throw new NotFoundError('Resume not found');
  return resume;
}

export async function getAtsScore(id: string, candidateId: string) {
  const resume = await resumeRepo.getResumeById(id, candidateId);
  if (!resume) throw new NotFoundError('Resume not found');
  return {
    atsScore: resume.atsScore,
    parseStatus: resume.parseStatus,
  };
}

export async function getSuggestions(id: string, candidateId: string) {
  const resume = await resumeRepo.getResumeById(id, candidateId);
  if (!resume) throw new NotFoundError('Resume not found');
  return resume.suggestions;
}

export async function analyzeForJob(
  resumeId: string,
  jobId: string,
  candidateId: string
) {
  const resume = await resumeRepo.getResumeById(resumeId, candidateId);
  if (!resume) throw new NotFoundError('Resume not found');
  if (resume.parseStatus !== 'COMPLETED' || !resume.parsedData) {
    throw new ValidationError('Resume must be parsed before analyzing for a job');
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId, status: 'ACTIVE' },
    include: { requiredSkills: { include: { skill: true } } },
  });
  if (!job) throw new NotFoundError('Job not found');

  const { computeATSScore } = await import('../parser/scorer');
  const jobSkills = job.requiredSkills.map((js) => js.skill.name);
  const atsResult = computeATSScore({
    parsedResume: resume.parsedData as any,
    jobKeywords: job.keywords,
    jobSkills,
  });

  await prisma.jobAtsScore.upsert({
    where: {
      resumeId_jobId: { resumeId, jobId },
    },
    update: {
      score: atsResult.total,
      matchedKeywords: atsResult.matchedKeywords,
      missingKeywords: atsResult.missingKeywords,
      breakdown: atsResult.breakdown as any,
    },
    create: {
      resumeId,
      jobId,
      score: atsResult.total,
      matchedKeywords: atsResult.matchedKeywords,
      missingKeywords: atsResult.missingKeywords,
      breakdown: atsResult.breakdown as any,
    },
  });

  return atsResult;
}
