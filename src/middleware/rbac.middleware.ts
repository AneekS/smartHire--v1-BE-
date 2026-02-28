import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../shared/errors/ForbiddenError';
export const rbacMiddleware = (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) return next(new ForbiddenError('Insufficient permissions'));
  next();
};