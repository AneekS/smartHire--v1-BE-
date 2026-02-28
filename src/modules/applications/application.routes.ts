import type { FastifyInstance } from 'fastify';
import { listHandler } from './application.controller';

export async function applicationRoutes(fastify: FastifyInstance) {
  const f = fastify as any;
  f.addHook('preHandler', f.authenticate);
  f.get('/', listHandler);
}
