const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'smarthire-backend');
const files = {};

files['src/middleware/auth.middleware.ts'] = `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/UnauthorizedError';
import Redis from 'ioredis';
const redis = new Redis(env.REDIS_URL);
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();
    const token = authHeader.split(' ')[1];
    const isRevoked = await redis.get(\`revoked:\${token}\`);
    if (isRevoked) throw new UnauthorizedError();
    const decoded: any = jwt.verify(token, env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role, email: decoded.email };
    next();
  } catch(err) { next(new UnauthorizedError('Invalid or expired token')); }
};`;

files['src/middleware/rbac.middleware.ts'] = `import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors/ForbiddenError';
export const rbacMiddleware = (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) return next(new ForbiddenError('Insufficient permissions'));
  next();
};`;

files['src/middleware/rateLimit.middleware.ts'] = `import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { env } from '../config/env';
import { RateLimitError } from '../shared/errors/RateLimitError';
const redis = new Redis(env.REDIS_URL);
export const rateLimitMiddleware = (key: string, maxRequests: number, windowSeconds: number) => rateLimit({
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.call(...args), prefix: \`rl:\${key}:\` }),
  windowMs: windowSeconds * 1000,
  max: maxRequests,
  handler: (req, res, next) => next(new RateLimitError()),
  keyGenerator: (req) => req.user?.userId || req.ip || 'unknown'
});`;

files['src/middleware/validate.middleware.ts'] = `import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../shared/errors/ValidationError';
export const validateMiddleware = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
  try { req.body = schema.parse(req.body); next(); } catch(err: any) { next(new ValidationError(err.format())); }
};`;

files['src/middleware/error.middleware.ts'] = `import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError';
import { logger } from '../shared/utils/logger';
export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    if (err.statusCode === 500) logger.error('AppError (500)', { err });
    return res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message, requestId: req.id, timestamp: new Date().toISOString(), details: err.details || [] } });
  }
  logger.error('Unhandled', { err });
  res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected error', requestId: req.id, timestamp: new Date().toISOString(), details: [] } });
};
export const notFoundMiddleware = (req: Request, res: Response, next: NextFunction) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found', requestId: req.id, timestamp: new Date().toISOString(), details: []} });`;

files['src/middleware/requestId.middleware.ts'] = `import { Request, Response, NextFunction } from 'express';
import { v4 } from 'uuid';
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.id = v4(); res.setHeader('X-Request-ID', req.id); next();
};`;

files['package.json'] = `{
  "name": "smarthire-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "test": "jest --runInBand",
    "test:coverage": "jest --coverage",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/s3-request-presigner": "^3.0.0",
    "@prisma/client": "^5.0.0",
    "bullmq": "^5.0.0",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "express": "^4.18.0",
    "express-rate-limit": "^7.0.0",
    "helmet": "^7.0.0",
    "ioredis": "^5.3.0",
    "jsonwebtoken": "^9.0.0",
    "rate-limit-redis": "^4.0.0",
    "uuid": "^9.0.0",
    "winston": "^3.11.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/compression": "^1.7.0",
    "@types/cors": "^2.8.0",
    "@types/express": "^4.17.0",
    "@types/jest": "^29.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/node": "^20.0.0",
    "@types/supertest": "^6.0.0",
    "@types/uuid": "^9.0.0",
    "jest": "^29.0.0",
    "prisma": "^5.0.0",
    "supertest": "^6.0.0",
    "ts-jest": "^29.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0"
  }
}`;

files['tsconfig.json'] = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "paths": { "@/": ["src/"] }
  },
  "include": ["src", "server.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}`;

files['.env.example'] = `DATABASE_URL=postgresql://user:password@localhost:5432/smarthire
REDIS_URL=redis://localhost:6379
JWT_SECRET=supersecretjwt_32characters_minimum
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
AWS_S3_BUCKET_NAME=mybucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
INTERNAL_API_SECRET=supersecret_internal_32chars_minim
RESUME_PARSE_WEBHOOK_SECRET=supersecret_webhook_32chars_mini
NODE_ENV=development
PORT=4000
LOG_LEVEL=info
CORS_ALLOWED_ORIGINS=http://localhost:3000`;

for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(baseDir, filename), content);
}
console.log('Script 2 finished');
