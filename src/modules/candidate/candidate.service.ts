import { NotFoundError } from '../../shared/errors';
import * as candidateRepo from './candidate.repository';
import type { UpdateProfileInput } from './candidate.schema';

export async function getMe(candidateId: string) {
  const candidate = await candidateRepo.getCandidateById(candidateId);
  if (!candidate) {
    throw new NotFoundError('Candidate not found');
  }
  const { passwordHash, ...rest } = candidate;
  return rest;
}

export async function updateProfile(candidateId: string, data: UpdateProfileInput) {
  await candidateRepo.getCandidateById(candidateId);
  return candidateRepo.updateProfile(candidateId, data);
}

export async function getDashboard(candidateId: string) {
  await candidateRepo.getCandidateById(candidateId);
  return candidateRepo.getDashboardData(candidateId);
}
