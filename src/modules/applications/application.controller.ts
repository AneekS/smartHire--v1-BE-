import * as applicationService from './application.service';
import { applyBodySchema } from './application.schema';
import { jobIdParamSchema } from '../jobs/jobs.schema';
import { success } from '../../shared/utils/response';
import { UnauthorizedError } from '../../shared/errors';

function getCandidateId(request: any): string {
  const sub = request.user?.sub;
  if (!sub) throw new UnauthorizedError('Not authenticated');
  return sub;
}

export async function applyHandler(request: any, reply: any) {
  const { id: jobId } = jobIdParamSchema.parse(request.params);
  const body = applyBodySchema.parse(request.body);
  const candidateId = getCandidateId(request);
  const data = await applicationService.apply(candidateId, jobId, body.resumeId);
  return success(reply, data, 201);
}

export async function listHandler(request: any, reply: any) {
  const candidateId = getCandidateId(request);
  const data = await applicationService.listByCandidate(candidateId);
  return success(reply, data);
}
