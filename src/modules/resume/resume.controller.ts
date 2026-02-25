import * as resumeService from './resume.service';
import { resumeIdParamSchema, analyzeForJobParamsSchema } from './resume.schema';
import { success } from '../../shared/utils/response';
import { UnauthorizedError } from '../../shared/errors';

function getCandidateId(request: any): string {
  const sub = request.user?.sub;
  if (!sub) throw new UnauthorizedError('Not authenticated');
  return sub;
}

export async function uploadHandler(request: any, reply: any) {
  const data = await request.file();
  if (!data) {
    return reply.status(400).send({ status: 'error', message: 'No file provided' });
  }

  const buffer = await data.toBuffer();
  const fileName = data.filename;
  const mimetype = data.mimetype;
  const candidateId = getCandidateId(request);

  const result = await resumeService.upload({
    buffer,
    fileName,
    mimetype,
    candidateId,
  });

  return success(reply, result, 201);
}

export async function getResumeHandler(request: any, reply: any) {
  const { id } = resumeIdParamSchema.parse(request.params);
  const candidateId = getCandidateId(request);
  const data = await resumeService.getResume(id, candidateId);
  return success(reply, data);
}

export async function getAtsScoreHandler(request: any, reply: any) {
  const { id } = resumeIdParamSchema.parse(request.params);
  const candidateId = getCandidateId(request);
  const data = await resumeService.getAtsScore(id, candidateId);
  return success(reply, data);
}

export async function getSuggestionsHandler(request: any, reply: any) {
  const { id } = resumeIdParamSchema.parse(request.params);
  const candidateId = getCandidateId(request);
  const data = await resumeService.getSuggestions(id, candidateId);
  return success(reply, data);
}

export async function analyzeForJobHandler(request: any, reply: any) {
  const { id: resumeId, jobId } = analyzeForJobParamsSchema.parse(request.params);
  const candidateId = getCandidateId(request);
  const data = await resumeService.analyzeForJob(resumeId, jobId, candidateId);
  return success(reply, data);
}
