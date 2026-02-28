import { Request, Response, NextFunction } from 'express';
import { redis } from '../shared/redis';

export const rateLimitMiddleware = (keyPrefix: string, maxRequests: number, windowSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userKey = req.user?.userId ?? (req.user as any)?.sub ?? req.ip ?? 'anonymous';
      const windowId = Math.floor(Date.now() / (windowSeconds * 1000));
      const rlKey = `rl:${keyPrefix}:${userKey}:${windowId}`;

      const [countStr] = await redis
        .multi()
        .incr(rlKey)
        .expire(rlKey, windowSeconds * 2)
        .exec() as any;

      const count = countStr[1];

      if (count > maxRequests) {
        res.setHeader('Retry-After', windowSeconds);
        res.status(429).json({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_ERROR' });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};