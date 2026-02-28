import { Router } from 'express';
import { validateMiddleware } from '../../../../middleware/validate.middleware';
import { dummyHandler } from './privacy.controller';
import { asyncHandler } from '../../../../shared/utils/asyncHandler';
export const privacyRouter = Router();
privacyRouter.get('/', asyncHandler(dummyHandler));