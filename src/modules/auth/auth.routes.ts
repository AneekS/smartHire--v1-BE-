import type { FastifyInstance } from 'fastify';
import { signupHandler, loginHandler, refreshHandler, logoutHandler } from './auth.controller';

export async function authRoutes(fastify: FastifyInstance) {
  (fastify as any).post('/signup', signupHandler);
  (fastify as any).post('/login', loginHandler);
  (fastify as any).post('/refresh', refreshHandler);
  (fastify as any).post('/logout', logoutHandler);
}
