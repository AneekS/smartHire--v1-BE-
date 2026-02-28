import { Request, Response, NextFunction } from 'express';
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
export const notFoundMiddleware = (req: Request, res: Response, next: NextFunction) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found', requestId: req.id, timestamp: new Date().toISOString(), details: []} });