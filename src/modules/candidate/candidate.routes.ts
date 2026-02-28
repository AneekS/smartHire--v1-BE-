import type { FastifyInstance } from 'fastify';
import {
  getMeHandler,
  updateMeHandler,
  getDashboardHandler,
} from './candidate.controller';

export async function candidateRoutes(fastify: FastifyInstance) {
  const f = fastify as any;
  f.addHook('preHandler', f.authenticate);
  f.get('/me', getMeHandler);
  f.put('/me', updateMeHandler);
  f.get('/me/dashboard', getDashboardHandler);
}
