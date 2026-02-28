import { Request, Response, NextFunction } from 'express';
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
