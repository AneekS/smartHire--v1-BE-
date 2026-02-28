import { z } from 'zod';

export const CreateProfileDto = z.object({
  fullName: z.string().trim().min(2).max(120),
  phoneCountryCode: z.string().trim().max(6).optional(),
  phoneNumber: z.string().trim().max(20).optional(),
  headline: z.string().trim().max(220).optional(),
  bio: z.string().trim().max(2000).optional(),
  locationCity: z.string().trim().max(100).optional(),
  locationState: z.string().trim().max(100).optional(),
  locationCountry: z.string().trim().length(2).default('IN')
});

export const UpdateProfileDto = CreateProfileDto.partial().extend({
  version: z.number().int().nonnegative()
});

export const RecruiterSearchDto = z.object({
  skillIds: z.array(z.string().uuid()).max(10).optional(),
  locations: z.array(z.string().trim()).max(5).optional(),
  availability: z.enum(['ACTIVELY_LOOKING', 'OPEN_TO_OFFERS', 'NOT_LOOKING']).optional(),
  minCompleteness: z.number().int().min(0).max(100).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20)
});