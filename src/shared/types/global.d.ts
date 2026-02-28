declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      sub: string;
      role: 'candidate' | 'recruiter';
      iat: number;
      exp: number;
    };
  }
}
