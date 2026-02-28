import * as jobsService from './jobs.service';
import { searchQuerySchema, jobIdParamSchema } from './jobs.schema';
import { success, paginated } from '../../shared/utils/response';
import { UnauthorizedError } from '../../shared/errors';

function getCandidateId(request: any): string | null {
  return request.user?.sub ?? null;
}

export async function searchHandler(request: any, reply: any) {
  const query = searchQuerySchema.parse(request.query);
  const { jobs, total } = await jobsService.searchJobs(query);
  return paginated(reply, jobs, query.page, query.limit, total);
}

export async function getByIdHandler(request: any, reply: any) {
  const { id } = jobIdParamSchema.parse(request.params);
  const data = await jobsService.getJobById(id);
  return success(reply, data);
}

export async function recommendedHandler(request: any, reply: any) {
  const candidateId = getCandidateId(request);
  if (!candidateId) throw new UnauthorizedError('Not authenticated');
  const limit = 20;
  const data = await jobsService.getRecommendedJobs(candidateId, limit);
  return success(reply, data);
}
