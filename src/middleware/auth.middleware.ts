import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/UnauthorizedError';
import { redis } from '../shared/redis';
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedError();
    const token = authHeader.split(' ')[1];
    const isRevoked = await redis.get(`revoked:${token}`);
    if (isRevoked) throw new UnauthorizedError();
    const decoded: any = jwt.verify(token, env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role, email: decoded.email };
    next();
  } catch (err) { next(new UnauthorizedError('Invalid or expired token')); }
};