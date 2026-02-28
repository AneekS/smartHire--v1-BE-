import type { FastifyInstance } from 'fastify';
import * as careerService from './career.service';
import { success } from '../../shared/utils/response';

export async function careerRoutes(fastify: FastifyInstance) {
  const f = fastify as any;
  f.addHook('preHandler', f.authenticate);

  f.get('/path', async (request: any, reply: any) => {
    const candidateId = request.user?.sub;
    if (!candidateId) return reply.status(401).send({ error: 'Unauthorized' });
    const targetRole = (request.query as any)?.targetRole;
    const data = await careerService.getCareerPath(candidateId, targetRole);
    return success(reply, data);
  });

  f.get('/learning-path', async (request: any, reply: any) => {
    const candidateId = request.user?.sub;
    if (!candidateId) return reply.status(401).send({ error: 'Unauthorized' });
    const skillGaps = (request.query as any)?.skillGaps;
    const data = await careerService.getLearningPath(
      candidateId,
      Array.isArray(skillGaps) ? skillGaps : undefined
    );
    return success(reply, data);
  });
}
