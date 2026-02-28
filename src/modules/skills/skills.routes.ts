import type { FastifyInstance } from 'fastify';
import * as skillsService from './skills.service';
import { success } from '../../shared/utils/response';

export async function skillsRoutes(fastify: FastifyInstance) {
  const f = fastify as any;
  f.addHook('preHandler', f.authenticate);

  f.get('/gap-analysis', async (request: any, reply: any) => {
    const candidateId = request.user?.sub;
    if (!candidateId) return reply.status(401).send({ error: 'Unauthorized' });
    const roleProfile = (request.query as any)?.roleProfile;
    const data = await skillsService.getGapAnalysis(candidateId, roleProfile);
    return success(reply, data);
  });
}
