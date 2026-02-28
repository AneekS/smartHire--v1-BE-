import * as candidateService from './candidate.service';
import { updateProfileSchema } from './candidate.schema';
import { success } from '../../shared/utils/response';
import { UnauthorizedError } from '../../shared/errors';

function getCandidateId(request: any): string {
  const sub = request.user?.sub;
  if (!sub) throw new UnauthorizedError('Not authenticated');
  return sub;
}

export async function getMeHandler(request: any, reply: any) {
  const candidateId = getCandidateId(request);
  const data = await candidateService.getMe(candidateId);
  return success(reply, data);
}

export async function updateMeHandler(request: any, reply: any) {
  const candidateId = getCandidateId(request);
  const body = updateProfileSchema.parse(request.body);
  const data = await candidateService.updateProfile(candidateId, body);
  return success(reply, data);
}

export async function getDashboardHandler(request: any, reply: any) {
  const candidateId = getCandidateId(request);
  const data = await candidateService.getDashboard(candidateId);
  return success(reply, data);
}
