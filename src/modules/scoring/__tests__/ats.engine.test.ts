
import {
  scoreSkills,
  scoreExperience,
  scoreEducation,
  scoreCompleteness,
  scoreBonus,
  computeFinalScore,
  scoreResumeAgainstJob,
} from '@/modules/scoring/ats.engine';
import { MAX_KEYWORDS } from '@/modules/scoring/scoring.constants';
import type { JobInput, ResumeInput, ScoringContext } from '@/modules/scoring/scoring.types';

describe('scoreSkills', () => {
  it('returns 100 when all required skills matched', () => {
    const result = scoreSkills(['js', 'ts'], ['js', 'ts'], 0.4);
    expect(result.score).toBe(100);
    expect(result.matched.sort()).toEqual(['js', 'ts']);
    expect(result.missing).toEqual([]);
  });

  it('returns 0 when no skills matched', () => {
    const result = scoreSkills(['go'], ['js', 'ts'], 0.4);
    expect(result.score).toBe(0);
    expect(result.matched).toEqual([]);
    expect(result.missing.sort()).toEqual(['js', 'ts']);
  });

  it('returns partial score proportional to matched count', () => {
    const result = scoreSkills(['js'], ['js', 'ts'], 0.4);
    expect(result.score).toBe(50);
  });

  it('is case-insensitive (normalizes before comparison)', () => {
    const result = scoreSkills(['JavaScript'], ['javascript'], 0.4);
    expect(result.score).toBe(100);
  });

  it('handles empty required skills array gracefully', () => {
    const result = scoreSkills(['js'], [], 0.4);
    expect(result.score).toBe(0);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it('caps keyword processing at MAX_KEYWORDS', () => {
    const resumeSkills = Array.from({ length: MAX_KEYWORDS + 10 }, (_, i) => `skill-${i}`);
    const requiredSkills = Array.from({ length: MAX_KEYWORDS + 10 }, (_, i) => `skill-${i}`);

    const result = scoreSkills(resumeSkills, requiredSkills, 0.4);
    expect(result.score).toBe(100);
  });
});

describe('scoreExperience', () => {
  it('returns full score when years >= required', () => {
    expect(scoreExperience(5, 5, 0.2)).toBe(100);
    expect(scoreExperience(6, 5, 0.2)).toBe(100);
  });

  it('returns partial score within 1yr gap', () => {
    expect(scoreExperience(2, 3, 0.2)).toBe(60);
  });

  it('returns 0 when years far below required', () => {
    expect(scoreExperience(1, 5, 0.2)).toBe(0);
  });

  it('handles zero required years', () => {
    expect(scoreExperience(0, 0, 0.2)).toBe(100);
  });
});

describe('scoreEducation', () => {
  it('returns 100 when level meets or exceeds requirement', () => {
    expect(scoreEducation('bachelor', 'associate', 0.2)).toBe(100);
    expect(scoreEducation('master', 'bachelor', 0.2)).toBe(100);
  });

  it('returns 0 when level is below requirement', () => {
    expect(scoreEducation('associate', 'bachelor', 0.2)).toBe(0);
  });

  it('handles unknown education level as none', () => {
    expect(scoreEducation('unknown-level', 'associate', 0.2)).toBe(0);
  });
});

describe('scoreCompleteness', () => {
  it('returns 100 when all sections present', () => {
    const resume = {
      skills: ['a'],
      experience: { years: 1 },
      education: { level: 'bachelor' },
      summary: 'summary',
    } as any;
    expect(scoreCompleteness(resume, 0.1)).toBe(100);
  });

  it('returns proportional score for partial sections', () => {
    const resume = {
      skills: ['a'],
      experience: { years: 1 },
      education: { level: 'bachelor' },
      summary: '',
    } as any;
    expect(scoreCompleteness(resume, 0.1)).toBe(75);
  });

  it('handles empty resume object', () => {
    expect(scoreCompleteness({} as unknown as any, 0.1)).toBe(0);
  });
});

describe('scoreBonus', () => {
  it('caps bonus at max regardless of items count', () => {
    const resume = {
      skills: ['a'],
      experience: { years: 1 },
      education: { level: 'bachelor' },
      summary: 'summary',
      certifications: ['c1'],
      projects: ['p1'],
      publications: ['pub1'],
      awards: ['a1'],
    } as any;
    expect(scoreBonus(resume, 0.1)).toBe(100);
  });

  it('returns 0 when no bonus items present', () => {
    const resume = {
      skills: ['a'],
      experience: { years: 1 },
      education: { level: 'bachelor' },
      summary: 'summary',
    } as any;
    expect(scoreBonus(resume, 0.1)).toBe(0);
  });
});

describe('computeFinalScore', () => {
  it('always returns integer', () => {
    const score = computeFinalScore([33.3, 33.3, 33.3]);
    expect(Number.isInteger(score)).toBe(true);
  });

  it('clamps to 0 minimum', () => {
    expect(computeFinalScore([-10])).toBe(0);
  });

  it('clamps to 100 maximum', () => {
    expect(computeFinalScore([120])).toBe(100);
  });

  it('rounds 0.5 up', () => {
    expect(computeFinalScore([0.5])).toBe(1);
  });
});

describe('scoreResumeAgainstJob (integration)', () => {
  it('returns deterministic result for same inputs', () => {
    const resume = {
      skills: ['JavaScript', 'TypeScript'],
      experience: { years: 3 },
      education: { level: 'bachelor' },
      summary: 'summary',
    } as any;

    const job = {
      requiredSkills: ['javascript', 'typescript'],
      preferredSkills: [],
      requiredExperienceYears: 3,
      requiredEducationLevel: 'bachelor',
      title: 'Fullstack Engineer',
      description: 'desc',
    } as any;

    const context: any = {
      tenantId: 't1',
      jobId: 'j1',
      resumeId: 'r1',
    };

    const first = scoreResumeAgainstJob(resume, job, context);
    const second = scoreResumeAgainstJob(resume, job, context);

    expect(first).toEqual(second);
  });

  it('returns full ScoringResult shape', () => {
    const resume = {
      skills: ['JavaScript', 'TypeScript'],
      experience: { years: 3 },
      education: { level: 'bachelor' },
      summary: 'summary',
    } as any;

    const job = {
      requiredSkills: ['javascript'],
      preferredSkills: [],
      requiredExperienceYears: 1,
      requiredEducationLevel: 'associate',
      title: 'Engineer',
      description: 'desc',
    } as any;

    const context: any = {
      tenantId: 't1',
      jobId: 'j1',
      resumeId: 'r1',
    };

    const result = scoreResumeAgainstJob(resume, job, context);

    expect(typeof result.score).toBe('number');
    expect(result.breakdown).toBeDefined();
    expect(Array.isArray(result.matchedKeywords)).toBe(true);
    expect(Array.isArray(result.missingKeywords)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.metadata).toBeDefined();
  });

  it('does not throw on malformed input — returns score: 0', () => {
    const resume = {} as unknown as any;
    const job = {} as unknown as any;
    const context: any = {
      tenantId: 't1',
      jobId: 'j1',
      resumeId: 'r1',
    };

    const result = scoreResumeAgainstJob(resume, job, context);
    expect(result.score).toBe(0);
  });

  it('processes 1000 keyword arrays in under reasonably fast time', () => {
    const resume = {
      skills: Array.from({ length: 1000 }, (_, i) => `skill-${i}`),
      experience: { years: 5 },
      education: { level: 'bachelor' },
      summary: 'summary',
    } as any;

    const job = {
      requiredSkills: Array.from({ length: 1000 }, (_, i) => `skill-${i}`),
      preferredSkills: [],
      requiredExperienceYears: 3,
      requiredEducationLevel: 'associate',
      title: 'Engineer',
      description: 'desc',
    } as any;

    const context: any = {
      tenantId: 't1',
      jobId: 'j1',
      resumeId: 'r1',
    };

    const start = performance.now();
    for (let i = 0; i < 1000; i += 1) {
      scoreResumeAgainstJob(resume, job, context);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500);
  });
});

