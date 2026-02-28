import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../shared/errors/ValidationError';
export const validateMiddleware = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
  try { req.body = schema.parse(req.body); next(); }
  catch (err: any) {
    const details = err.errors?.map((e: any) => ({
      field: e.path.join('.') || 'root',
      message: e.message,
      code: e.code
    })) ?? [];
    next(new ValidationError(details, 'Validation failed'));
  }
};