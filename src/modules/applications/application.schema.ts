import { z } from 'zod';

export const applyBodySchema = z.object({
  resumeId: z.string().min(1),
});

export type ApplyBody = z.infer<typeof applyBodySchema>;
