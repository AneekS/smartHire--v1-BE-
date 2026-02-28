import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  githubUrl: z.string().url().optional().nullable(),
  portfolioUrl: z.string().url().optional().nullable(),
  preferredRoles: z.array(z.string()).optional(),
  preferredLocations: z.array(z.string()).optional(),
  salaryExpectation: z.number().int().min(0).optional().nullable(),
  workType: z.enum(['remote', 'hybrid', 'onsite']).optional().nullable(),
  experienceLevel: z.enum(['fresher', 'junior', 'mid', 'senior']).optional().nullable(),
  education: z.any().optional(),
  isPublic: z.boolean().optional(),
  showReputationScore: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
