import { NotFoundError } from '../../shared/errors';
import * as jobsRepo from './jobs.repository';
import type { SearchQuery } from './jobs.schema';

export async function searchJobs(query: SearchQuery) {
  return jobsRepo.searchJobs(query);
}

export async function getJobById(id: string) {
  const job = await jobsRepo.getJobById(id);
  if (!job) throw new NotFoundError('Job not found');
  return job;
}

export async function getRecommendedJobs(candidateId: string, limit?: number) {
  return jobsRepo.getRecommendedJobs(candidateId, limit);
}
