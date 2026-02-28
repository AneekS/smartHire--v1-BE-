import type { FastifyInstance } from 'fastify';
import { searchHandler, getByIdHandler, recommendedHandler } from './jobs.controller';
import { applyHandler } from '../applications/application.controller';

export async function jobsRoutes(fastify: FastifyInstance) {
  const f = fastify as any;
  f.get('/search', searchHandler);
  f.get('/recommended', { preHandler: f.authenticate }, recommendedHandler);
  f.get('/:id', getByIdHandler);
  f.post('/:id/apply', { preHandler: f.authenticate }, applyHandler);
}
