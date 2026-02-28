import { Request, Response, NextFunction } from 'express';
import { v4 } from 'uuid';
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.id = v4(); res.setHeader('X-Request-ID', req.id); next();
};