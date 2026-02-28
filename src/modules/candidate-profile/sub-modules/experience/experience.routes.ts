import { Router } from 'express';
import { validateMiddleware } from '../../../../middleware/validate.middleware';
import { dummyHandler } from './experience.controller';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
export const experienceRouter = Router();
experienceRouter.get('/', asyncHandler(dummyHandler));