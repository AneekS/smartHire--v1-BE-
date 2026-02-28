import {
  BONUS_ITEMS,
  EDUCATION_LEVELS,
  MAX_KEYWORDS,
  MAX_TOTAL_BONUS,
  REQUIRED_RESUME_SECTIONS,
  SCORE_WEIGHTS,
  SCORING_VERSION,
} from '@/modules/scoring/scoring.constants';
import {
  buildKeywordSet,
  diffSets,
  intersectSets,
  normalizeEducationLevel,
  normalizeKeyword,
  safeTruncate,
  buildSuggestions,
} from '@/modules/scoring/normalization.utils';
import type { JobInput, ResumeInput, ScoringContext, ScoringResult, ScoreBreakdown, WeightStrategy } from '@/modules/scoring/scoring.types';

/**
 * === HORIZONTAL SCALING STRATEGY ===
 *
 * This engine is a pure function — no shared state, no DB, no Redis.
 * This means:
 * 1. Any K8s pod can serve any request — no sticky sessions required
 * 2. Scaling = adding pods. No coordination overhead.
 * 3. Weighted scoring recomputation is O(n) in keyword count — CPU-bound workload
 *    that benefits from multiple cores via K8s pod autoscaling (HPA on CPU metric)
 *
 * === CACHE ARCHITECTURE (L1 + L2) ===
 *
 * L1: In-process LRU (node-lru-cache, max 1000 entries, ~10MB)
 *     - Absorbs hot-key bursts without hitting Redis
 *     - Invalidated on pod restart (acceptable — L2 persists)
 * L2: Redis Cluster with {tenantId} hashtag slot affinity
 *     - Ensures tenant data is co-located on same shard
 *     - Prevents cross-slot operations
 *
 * === MEMORY SAFETY ===
 *
 * - MAX_PAYLOAD_BYTES guard prevents string explosion attacks
 * - MAX_KEYWORDS cap prevents O(n²) Set intersection on malicious payloads
 * - All arrays are `.slice(0, MAX_KEYWORDS)` before processing
 * - No regex catastrophic backtracking — only String.prototype methods used
 * - Buffer.byteLength used for accurate byte counting (handles multibyte UTF-8)
 *
 * === ENGINE VERSIONING ===
 *
 * SCORING_VERSION is embedded in every response.metadata.
 * To introduce v2 scoring:
 * 1. Create src/modules/scoring/v2/ats.engine.ts
 * 2. Add version routing in scoring.service.ts based on tenant feature flag
 * 3. v1 results remain cached under v1 keys — no cache pollution
 * 4. Shadow mode: run both engines, log diff, validate before cutover
 */

/**
 * Compute the final weighted score for a resume against a job description.
 *
 * SCALING NOTE: this function is intentionally pure and CPU-bound. It does
 * not allocate shared state or perform any I/O, which allows horizontal
 * scaling across pods without coordination.
 *
 * @param resume - Parsed resume input.
 * @param job - Parsed job description input.
 * @param context - Scoring context including tenant and IDs.
 * @returns Complete scoring result, never throws.
 * @pure
 */
export function scoreResumeAgainstJob(
  resume: ResumeInput,
  job: JobInput,
  context: ScoringContext,
): ScoringResult {
  try {
    const effectiveWeights: Required<WeightStrategy> = {
      skill: context.weights?.skill ?? SCORE_WEIGHTS.skill,
      experience: context.weights?.experience ?? SCORE_WEIGHTS.experience,
      education: context.weights?.education ?? SCORE_WEIGHTS.education,
      completeness: context.weights?.completeness ?? SCORE_WEIGHTS.completeness,
      bonus: context.weights?.bonus ?? SCORE_WEIGHTS.bonus,
    } as Required<WeightStrategy>;

    const resumeSkills = (resume.skills ?? []).slice(0, MAX_KEYWORDS).map((s: string) => normalizeKeyword(safeTruncate(s)));
    const requiredSkills = (job.requiredSkills ?? [])
      .slice(0, MAX_KEYWORDS)
      .map((s: string) => normalizeKeyword(safeTruncate(s)));

    const skillResult = scoreSkills(resumeSkills, requiredSkills, effectiveWeights.skill);

    const experienceScore = scoreExperience(
      resume.experience?.years ?? 0,
      job.requiredExperienceYears,
      effectiveWeights.experience,
    );

    const educationScore = scoreEducation(
      resume.education?.level ?? 'none',
      job.requiredEducationLevel,
      effectiveWeights.education,
    );

    const completenessScore = scoreCompleteness(resume, effectiveWeights.completeness);
    const bonusScore = scoreBonus(resume, effectiveWeights.bonus);

    const breakdown: ScoreBreakdown = {
      skillScore: skillResult.score,
      experienceScore,
      educationScore,
      completenessScore,
      bonusScore,
    };

    const weightedComponents: number[] = [
      breakdown.skillScore * effectiveWeights.skill,
      breakdown.experienceScore * effectiveWeights.experience,
      breakdown.educationScore * effectiveWeights.education,
      breakdown.completenessScore * effectiveWeights.completeness,
      breakdown.bonusScore * effectiveWeights.bonus,
    ];

    const finalScore = computeFinalScore(weightedComponents);

    const suggestions = buildSuggestions(breakdown, skillResult.missing, effectiveWeights);

    return {
      score: finalScore,
      breakdown,
      matchedKeywords: skillResult.matched,
      missingKeywords: skillResult.missing,
      suggestions,
      metadata: {
        processingTimeMs: 0,
        version: SCORING_VERSION,
        cacheHit: false,
      },
    };
  } catch {
    // Defensive fallback – never throw from engine.
    const zeroBreakdown: ScoreBreakdown = {
      skillScore: 0,
      experienceScore: 0,
      educationScore: 0,
      completenessScore: 0,
      bonusScore: 0,
    };

    return {
      score: 0,
      breakdown: zeroBreakdown,
      matchedKeywords: [],
      missingKeywords: [],
      suggestions: [],
      metadata: {
        processingTimeMs: 0,
        version: SCORING_VERSION,
        cacheHit: false,
      },
    };
  }
}

/**
 * Score skills by computing overlap between resume and required skills.
 *
 * @param resumeSkills - Normalized resume skills.
 * @param requiredSkills - Normalized required skills.
 * @param _weight - Component weight (reserved for future use).
 * @returns Object containing score, matched, and missing keywords.
 * @pure
 */
export function scoreSkills(
  resumeSkills: string[],
  requiredSkills: string[],
  _weight: number,
): { score: number; matched: string[]; missing: string[] } {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { score: 0, matched: [], missing: [] };
  }

  const resumeSet = buildKeywordSet(resumeSkills, MAX_KEYWORDS);
  const requiredSet = buildKeywordSet(requiredSkills, MAX_KEYWORDS);

  const matched = intersectSets(resumeSet, requiredSet);
  const missing = diffSets(requiredSet, resumeSet);

  const totalRequired = requiredSet.size || 1;
  const ratio = matched.length / totalRequired;
  const rawScore = Math.round(ratio * 100);

  return {
    score: rawScore,
    matched,
    missing,
  };
}

/**
 * Score experience based on years relative to job requirement.
 *
 * @param resumeYears - Years of candidate experience.
 * @param requiredYears - Required years of experience for the job.
 * @param _weight - Component weight (reserved for future use).
 * @returns Experience score between 0 and 100.
 * @pure
 */
export function scoreExperience(resumeYears: number, requiredYears: number, _weight: number): number {
  if (requiredYears <= 0) {
    return 100;
  }

  const safeResumeYears = Number.isFinite(resumeYears) && resumeYears >= 0 ? resumeYears : 0;

  if (safeResumeYears >= requiredYears) {
    return 100;
  }

  if (safeResumeYears >= requiredYears * 0.75) {
    return 80;
  }

  if (safeResumeYears >= requiredYears - 1) {
    return 60;
  }

  return 0;
}

/**
 * Score education by comparing normalized levels against requirements.
 *
 * @param resumeLevel - Candidate education level.
 * @param requiredLevel - Required education level for the job.
 * @param _weight - Component weight (reserved for future use).
 * @returns Education score between 0 and 100.
 * @pure
 */
export function scoreEducation(resumeLevel: string, requiredLevel: string, _weight: number): number {
  const normalizedResume = normalizeEducationLevel(resumeLevel);
  const normalizedRequired = normalizeEducationLevel(requiredLevel);

  const resumeOrdinal = EDUCATION_LEVELS[normalizedResume];
  const requiredOrdinal = EDUCATION_LEVELS[normalizedRequired];

  if (resumeOrdinal >= requiredOrdinal) {
    return 100;
  }

  return 0;
}

/**
 * Score resume completeness based on presence of required sections.
 *
 * @param resume - Resume input object.
 * @param _weight - Component weight (reserved for future use).
 * @returns Completeness score between 0 and 100.
 * @pure
 */
export function scoreCompleteness(resume: ResumeInput, _weight: number): number {
  if (!resume) {
    return 0;
  }

  let present = 0;

  for (const section of REQUIRED_RESUME_SECTIONS) {
    const value = (resume as unknown as Record<string, unknown>)[section];

    if (Array.isArray(value) && value.length > 0) {
      present += 1;
    } else if (value && typeof value === 'object') {
      present += 1;
    } else if (typeof value === 'string' && value.trim().length > 0) {
      present += 1;
    }
  }

  const ratio = present / REQUIRED_RESUME_SECTIONS.length;
  return Math.round(ratio * 100);
}

/**
 * Score bonus items such as certifications, projects, publications, and awards.
 *
 * @param resume - Resume input object.
 * @param _weight - Component weight (reserved for future use).
 * @returns Bonus score between 0 and 100.
 * @pure
 */
export function scoreBonus(resume: ResumeInput, _weight: number): number {
  if (!resume) {
    return 0;
  }

  let bonusFraction = 0;

  for (const item of BONUS_ITEMS) {
    const value = (resume as unknown as Record<string, unknown>)[item];
    const hasValue =
      (Array.isArray(value) && value.length > 0) ||
      (typeof value === 'string' && value.trim().length > 0);

    if (hasValue) {
      bonusFraction += MAX_TOTAL_BONUS / BONUS_ITEMS.length;
    }
  }

  if (bonusFraction > MAX_TOTAL_BONUS) {
    bonusFraction = MAX_TOTAL_BONUS;
  }

  return Math.round((bonusFraction / MAX_TOTAL_BONUS) * 100);
}

/**
 * Clamp and round a weighted component sum into the integer range 0–100.
 *
 * @param weightedComponents - Array of weighted component scores.
 * @returns Final clamped integer score.
 * @pure
 */
export function computeFinalScore(weightedComponents: number[]): number {
  const sum = weightedComponents.reduce((acc, value) => acc + (Number.isFinite(value) ? value : 0), 0);
  const rounded = Math.round(sum);
  if (Number.isNaN(rounded)) {
    return 0;
  }

  return Math.min(100, Math.max(0, rounded));
}

