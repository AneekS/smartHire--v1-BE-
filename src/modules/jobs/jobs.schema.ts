import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  role: z.string().optional(),
  location: z.string().optional(),
  experienceMin: z.coerce.number().optional(),
  experienceMax: z.coerce.number().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const jobIdParamSchema = z.object({
  id: z.string().min(1),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type JobIdParam = z.infer<typeof jobIdParamSchema>;
