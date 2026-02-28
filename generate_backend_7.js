const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'smarthire-backend');

// Fix 1: internalAuth.middleware
fs.writeFileSync(path.join(baseDir, 'src/middleware/internalAuth.middleware.ts'), `import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/UnauthorizedError';
import { logger } from '../shared/utils/logger';

export const internalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-internal-token'];
  if (!token || typeof token !== 'string') {
    logger.warn('Internal webhook attempt without token', { ip: req.ip });
    return next(new UnauthorizedError('Missing internal token'));
  }

  try {
    const expected = Buffer.from(env.INTERNAL_API_SECRET);
    const provided = Buffer.from(token);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      throw new Error('Mismatch');
    }
    next();
  } catch (err) {
    logger.warn('Invalid internal token attempt', { ip: req.ip });
    next(new UnauthorizedError('Invalid internal token'));
  }
};
`);

// Fix 2: env.ts missing array
const envPath = path.join(baseDir, 'src/config/env.ts');
let envCode = fs.readFileSync(envPath, 'utf8');
envCode = envCode.replace('export const env = parsed.data;', `export const env = {
  ...parsed.data,
  CORS_ALLOWED_ORIGINS_ARRAY: parsed.data.CORS_ALLOWED_ORIGINS.split(',').map((s: string) => s.trim())
};`);
fs.writeFileSync(envPath, envCode);

// Fix 4: sendResponse in apiResponse
fs.writeFileSync(path.join(baseDir, 'src/shared/utils/apiResponse.ts'), `import { Response } from 'express';
export const sendResponse = (res: Response, statusCode: number, data: any) => res.status(statusCode).json({ success: statusCode >= 200 && statusCode < 300, data });
export const sendPaginatedResponse = (res: Response, items: any[], meta: any) => res.json({ success: true, data: { items, meta } });
`);

// Fix 7 & 3: Fix tx implicitly any, and dummyLogic missing
// profile-gdpr-delete.job.ts
let gdprJob = fs.readFileSync(path.join(baseDir, 'src/jobs/profile-gdpr-delete.job.ts'), 'utf8');
gdprJob = gdprJob.replace('async (tx) => {', 'async (tx: any) => {');
fs.writeFileSync(path.join(baseDir, 'src/jobs/profile-gdpr-delete.job.ts'), gdprJob);

let candidateService = fs.readFileSync(path.join(baseDir, 'src/modules/candidate-profile/candidate-profile.service.ts'), 'utf8');
candidateService = candidateService.replace('async (tx) => {', 'async (tx: any) => {');
fs.writeFileSync(path.join(baseDir, 'src/modules/candidate-profile/candidate-profile.service.ts'), candidateService);

['skills', 'resume-sync', 'privacy'].forEach(mod => {
    const p = path.join(baseDir, \`src/modules/candidate-profile/sub-modules/\${mod}/\${mod}.service.ts\`);
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/async dummyLogic\(\) \{ return true; \}/g, ''); // Ensure no dup
  code = code.replace('export class ' + capitalize(mod) + 'Service {', 'export class ' + capitalize(mod) + 'Service {\n  async dummyLogic() { return true; }');
  code = code.replace('async (tx) => {', 'async (tx: any) => {');
  fs.writeFileSync(p, code);
});

// Fix 8: rateLimit.middleware Redis type
let rm = fs.readFileSync(path.join(baseDir, 'src/middleware/rateLimit.middleware.ts'), 'utf8');
rm = rm.replace('(...args: string[]) => redis.call(...args)', 'async (...args: string[]) => (await redis.call(...args)) as any');
fs.writeFileSync(path.join(baseDir, 'src/middleware/rateLimit.middleware.ts'), rm);

function capitalize(s) {
  if (typeof s !== 'string') return '';
  return s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

console.log('Fixed TS errors step 1');
