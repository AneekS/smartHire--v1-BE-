import type { FastifyInstance } from 'fastify';
import {
  uploadHandler,
  getResumeHandler,
  getAtsScoreHandler,
  getSuggestionsHandler,
  analyzeForJobHandler,
} from './resume.controller';

export async function resumeRoutes(fastify: FastifyInstance) {
  const f = fastify as any;
  f.addHook('preHandler', f.authenticate);
  f.post('/upload', uploadHandler);
  f.get('/:id', getResumeHandler);
  f.get('/:id/ats-score', getAtsScoreHandler);
  f.get('/:id/suggestions', getSuggestionsHandler);
  f.post('/:id/analyze-for-job/:jobId', analyzeForJobHandler);
}
