/**
 * Scoring engine constants and configuration.
 *
 * All numeric weights, limits, and version identifiers used by the ATS
 * scoring engine are centralized here to avoid magic numbers elsewhere.
 */

/** Version identifier for the ATS scoring engine. */
export const SCORING_VERSION = 'v1.0.0';

/**
 * Top-level weight distribution for each scoring component.
 *
 * The weights must always sum to 1.0.
 */
export const SCORE_WEIGHTS = {
  skill: 0.4,
  experience: 0.2,
  education: 0.2,
  completeness: 0.1,
  bonus: 0.1,
} as const;

/**
 * Ordered education level map used for ordinal comparisons.
 *
 * Higher numeric values represent higher education levels.
 */
export const EDUCATION_LEVELS = {
  none: 0,
  associate: 1,
  bachelor: 2,
  master: 3,
  phd: 4,
} as const;

/** Required resume sections used for completeness scoring. */
export const REQUIRED_RESUME_SECTIONS = ['skills', 'experience', 'education', 'summary'] as const;

/** Optional resume sections that contribute to the bonus score. */
export const BONUS_ITEMS = ['certifications', 'projects', 'publications', 'awards'] as const;

/** Maximum bonus contribution per bonus item (fraction of total score). */
export const MAX_BONUS_PER_ITEM = 0.025;

/** Maximum aggregate bonus contribution (fraction of total score). */
export const MAX_TOTAL_BONUS = 0.1;

/**
 * Experience thresholds (in years) used for categorizing candidates.
 *
 * These are not directly exposed but useful for future heuristics.
 */
export const EXPERIENCE_THRESHOLDS = {
  junior: 2,
  mid: 4,
  senior: 7,
} as const;

/** Maximum payload size per textual field in bytes (64 KiB). */
export const MAX_PAYLOAD_BYTES = 65_536;

/** TTL for cached scoring results in seconds (1 hour). */
export const CACHE_TTL_SECONDS = 3_600;

/** Redis key prefix used for all ATS scoring-related keys. */
export const REDIS_KEY_PREFIX = 'smarthire:ats';

/** Maximum number of keywords processed per request. */
export const MAX_KEYWORDS = 200;

