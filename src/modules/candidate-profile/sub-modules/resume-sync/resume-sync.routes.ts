import { Router } from 'express';
import { validateMiddleware } from '../../../../middleware/validate.middleware';
import { dummyHandler } from './resume-sync.controller';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
export const resumeSyncRouter = Router();
resumeSyncRouter.get('/', asyncHandler(dummyHandler));