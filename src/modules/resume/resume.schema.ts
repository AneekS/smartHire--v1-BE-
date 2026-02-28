import { z } from 'zod';

export const resumeIdParamSchema = z.object({
  id: z.string().min(1),
});

export const analyzeForJobParamsSchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
});

export type ResumeIdParam = z.infer<typeof resumeIdParamSchema>;
export type AnalyzeForJobParams = z.infer<typeof analyzeForJobParamsSchema>;
