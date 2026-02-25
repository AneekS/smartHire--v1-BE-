import { z } from 'zod';

const PersonalInfoSchema = z.object({
  name: z.string().nullable(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  github: z.string().nullable().optional(),
  portfolio: z.string().nullable().optional(),
});

const ExperienceSchema = z.array(
  z.object({
    company: z.string(),
    role: z.string(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    durationMonths: z.number().nullable().optional(),
    location: z.string().nullable().optional(),
    bullets: z.array(z.string()),
    techStack: z.array(z.string()),
    hasQuantifiedAchievements: z.boolean(),
  })
);

const SkillsSchema = z.object({
  languages: z.array(z.string()),
  frameworks: z.array(z.string()),
  databases: z.array(z.string()),
  cloud: z.array(z.string()),
  tools: z.array(z.string()),
  methodologies: z.array(z.string()).optional().default([]),
  soft: z.array(z.string()).optional().default([]),
});

const MetricsSchema = z.object({
  totalExperienceYears: z.number().min(0).max(50),
  projectCount: z.number().min(0),
  uniqueSkillCount: z.number().min(0),
  hasQuantifiedAchievements: z.boolean(),
  hasSummary: z.boolean(),
  hasLinkedin: z.boolean(),
  hasGithub: z.boolean(),
  estimatedSeniorityLevel: z.enum(['fresher', 'junior', 'mid', 'senior']),
});

export const ParsedResumeSchema = z.object({
  personalInfo: PersonalInfoSchema,
  summary: z.string().nullable(),
  experience: ExperienceSchema,
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      branch: z.string().nullable().optional(),
      year: z.number().nullable().optional(),
      gpa: z.number().nullable().optional(),
      grade: z.string().nullable().optional(),
    })
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      techStack: z.array(z.string()),
      links: z.array(z.string()),
      isOpenSource: z.boolean(),
    })
  ),
  skills: SkillsSchema,
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().nullable().optional(),
      year: z.number().nullable().optional(),
    })
  ),
  achievements: z.array(z.string()),
  metrics: MetricsSchema,
});

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

const defaultParsed: ParsedResume = {
  personalInfo: {
    name: null,
    email: null,
    phone: null,
    location: null,
    linkedin: null,
    github: null,
    portfolio: null,
  },
  summary: null,
  experience: [],
  education: [],
  projects: [],
  skills: {
    languages: [],
    frameworks: [],
    databases: [],
    cloud: [],
    tools: [],
    methodologies: [],
    soft: [],
  },
  certifications: [],
  achievements: [],
  metrics: {
    totalExperienceYears: 0,
    projectCount: 0,
    uniqueSkillCount: 0,
    hasQuantifiedAchievements: false,
    hasSummary: false,
    hasLinkedin: false,
    hasGithub: false,
    estimatedSeniorityLevel: 'fresher',
  },
};

export function validateParsedResume(raw: unknown): ParsedResume {
  const result = ParsedResumeSchema.safeParse(raw);

  if (result.success) {
    return result.data;
  }

  console.warn('AI output validation warnings:', result.error.flatten().fieldErrors);

  const recovered = ParsedResumeSchema.partial().safeParse(raw);
  if (recovered.success) {
    return { ...defaultParsed, ...recovered.data } as ParsedResume;
  }

  throw new Error(`AI resume parse output is completely invalid: ${result.error.message}`);
}
