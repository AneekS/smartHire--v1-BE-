import { Router } from 'express';
import { validateMiddleware } from '../../../../middleware/validate.middleware';
import { dummyHandler } from './career-intent.controller';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
export const careerIntentRouter = Router();
careerIntentRouter.get('/', asyncHandler(dummyHandler));