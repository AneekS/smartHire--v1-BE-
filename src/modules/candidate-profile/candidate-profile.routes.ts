import { Router } from 'express';
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import * as controller from './candidate-profile.controller';
import { CreateProfileDto, UpdateProfileDto } from './candidate-profile.validator';

export const candidateProfileRouter = Router();

candidateProfileRouter.post('/', rateLimitMiddleware('candidate-api', 5, 60), validateMiddleware(CreateProfileDto), asyncHandler(controller.createProfile));
candidateProfileRouter.get('/', rateLimitMiddleware('candidate-api', 100, 60), asyncHandler(controller.getMyProfile));
candidateProfileRouter.get('/:profileId', rateLimitMiddleware('candidate-api', 100, 60), rbacMiddleware(["RECRUITER", "ADMIN"]), asyncHandler(controller.getProfileById));
candidateProfileRouter.patch('/', rateLimitMiddleware('candidate-api', 30, 60), validateMiddleware(UpdateProfileDto), asyncHandler(controller.updateProfile));
candidateProfileRouter.delete('/', rateLimitMiddleware('candidate-api', 5, 60), asyncHandler(controller.softDeleteProfile));
