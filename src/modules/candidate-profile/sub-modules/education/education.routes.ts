import { Router } from 'express';
import { validateMiddleware } from '../../../../middleware/validate.middleware';
import { dummyHandler } from './education.controller';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
export const educationRouter = Router();
educationRouter.get('/', asyncHandler(dummyHandler));