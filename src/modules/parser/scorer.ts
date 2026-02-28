import type { ParsedResume } from './response.validator';

export interface ScoringInput {
  parsedResume: ParsedResume;
  jobKeywords?: string[];
  jobSkills?: string[];
  targetRole?: string;
}

export interface ATSScore {
  total: number;
  breakdown: {
    skillsMatch: number;
    experienceRelevance: number;
    educationMatch: number;
    resumeQuality: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
}

export function computeATSScore(input: ScoringInput): ATSScore {
  const { parsedResume, jobKeywords = [], jobSkills = [] } = input;

  const candidateSkills = [
    ...parsedResume.skills.languages,
    ...parsedResume.skills.frameworks,
    ...parsedResume.skills.databases,
    ...parsedResume.skills.tools,
    ...parsedResume.skills.cloud,
  ].map((s) => s.toLowerCase());

  const normalizedJobSkills = jobSkills.map((s) => s.toLowerCase());
  const matchedSkills = normalizedJobSkills.filter((s) =>
    candidateSkills.some((cs) => cs.includes(s) || s.includes(cs))
  );
  const skillsMatch =
    normalizedJobSkills.length > 0
      ? Math.round((matchedSkills.length / normalizedJobSkills.length) * 40)
      : 20;

  const experienceYears = parsedResume.metrics.totalExperienceYears;
  const experienceScore = Math.min(experienceYears * 5, 25);
  const experienceRelevance = Math.round(experienceScore);

  const hasRelevantDegree = parsedResume.education.some((e) =>
    ['b.tech', 'be', 'bsc', 'mca', 'm.tech', 'msc'].some((deg) =>
      e.degree.toLowerCase().includes(deg)
    )
  );
  const educationMatch = hasRelevantDegree ? 15 : 8;

  let qualityScore = 0;
  if (parsedResume.metrics.hasSummary) qualityScore += 4;
  if (parsedResume.metrics.hasLinkedin) qualityScore += 3;
  if (parsedResume.metrics.hasGithub) qualityScore += 3;
  if (parsedResume.metrics.hasQuantifiedAchievements) qualityScore += 5;
  if (parsedResume.projects.length >= 2) qualityScore += 5;
  const resumeQuality = Math.min(qualityScore, 20);

  const resumeText = JSON.stringify(parsedResume).toLowerCase();
  const matchedKeywords = jobKeywords.filter((k) =>
    resumeText.includes(k.toLowerCase())
  );
  const missingKeywords = jobKeywords.filter(
    (k) => !resumeText.includes(k.toLowerCase())
  );

  const total = Math.min(
    skillsMatch + experienceRelevance + educationMatch + resumeQuality,
    100
  );

  return {
    total,
    breakdown: {
      skillsMatch,
      experienceRelevance,
      educationMatch,
      resumeQuality,
    },
    matchedKeywords,
    missingKeywords,
  };
}
