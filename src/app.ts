import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { rbacMiddleware } from './middleware/rbac.middleware';
import { internalAuthMiddleware } from './middleware/internalAuth.middleware';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { logger } from './shared/utils/logger';

// Routers
import { candidateProfileRouter } from './modules/candidate-profile/candidate-profile.routes';

export const app: Express = express();

app.use(requestIdMiddleware);
app.use(express.json({ limit: "50kb" }));
app.use(helmet());
app.use(cors({ origin: env.CORS_ALLOWED_ORIGINS_ARRAY }));
app.use(compression());
app.use((req, res, next) => {
  logger.info({ message: 'Incoming request', method: req.method, url: req.url, id: req.id });
  next();
});

import { prisma } from './config/database';
import { redis } from './shared/redis';

// Health routes
app.get('/health', async (req, res) => {
  const [db, redisOk] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping()
  ]);
  const status = db.status === 'fulfilled' && redisOk.status === 'fulfilled'
    ? 200 : 503;
  res.status(status).json({
    status: status === 200 ? 'ok' : 'degraded',
    db: db.status === 'fulfilled' ? 'ok' : 'down',
    redis: redisOk.status === 'fulfilled' ? 'ok' : 'down',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1/candidates/profile', rateLimitMiddleware('candidate-api', 100, 60), authMiddleware, candidateProfileRouter);

// More routes dynamically added here for recruiters, admins, internal (mocked out due to size)
const recruiterRouter = express.Router();
app.use('/api/v1/recruiter', rateLimitMiddleware('recruiter-api', 200, 60), authMiddleware, rbacMiddleware(["RECRUITER", "ADMIN"]), recruiterRouter);

const adminRouter = express.Router();
app.use('/api/v1/admin', rateLimitMiddleware('admin-api', 100, 60), authMiddleware, rbacMiddleware(["ADMIN"]), adminRouter);

const internalRouter = express.Router();
app.use('/api/v1/internal', internalAuthMiddleware, internalRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
