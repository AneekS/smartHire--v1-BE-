import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { UnauthorizedError } from '../../../shared/errors';

export interface JWTPayload {
  sub: string;
  role: 'candidate' | 'recruiter';
  iat: number;
  exp: number;
}

async function authPlugin(fastify: FastifyInstance) {
  (fastify as any).decorate('authenticate', async function (request: any, _reply: any) {
    const authHeader = request.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      request.user = payload;
    } catch {
      throw new UnauthorizedError('Invalid token');
    }
  });
}

export default fp(authPlugin, { name: 'auth-plugin' });

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
