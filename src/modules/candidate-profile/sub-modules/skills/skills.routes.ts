import { Router } from 'express';
import { validateMiddleware } from '../../../../middleware/validate.middleware';
import { dummyHandler } from './skills.controller';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
export const skillsRouter = Router();
skillsRouter.get('/', asyncHandler(dummyHandler));