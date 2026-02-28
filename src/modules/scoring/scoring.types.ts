import type { ResumeInput, JobInput } from '@/modules/scoring/scoring.schema';
import type { SCORE_WEIGHTS } from '@/modules/scoring/scoring.constants';

/**
 * Breakdown of individual scoring components.
 */
export interface ScoreBreakdown {
  /** Skill match score (0–100). */
  skillScore: number;
  /** Experience relevance score (0–100). */
  experienceScore: number;
  /** Education match score (0–100). */
  educationScore: number;
  /** Resume completeness score (0–100). */
  completenessScore: number;
  /** Bonus feature score (0–100). */
  bonusScore: number;
}

/**
 * Metadata emitted by the scoring engine.
 */
export interface ScoringMetadata {
  /** Total processing time in milliseconds (engine + orchestration). */
  processingTimeMs: number;
  /** Version identifier of the scoring engine. */
  version: string;
  /** Indicates whether result was served from cache. */
  cacheHit: boolean;
}

/**
 * Full scoring result returned to API consumers.
 */
export interface ScoringResult {
  /** Final aggregate score, clamped integer in the range 0–100. */
  score: number;
  /** Per-component score breakdown. */
  breakdown: ScoreBreakdown;
  /** Normalized, lowercased matched keywords. */
  matchedKeywords: string[];
  /** Normalized, lowercased missing keywords. */
  missingKeywords: string[];
  /** Human-readable improvement suggestions. */
  suggestions: string[];
  /** Engine and processing metadata. */
  metadata: ScoringMetadata;
}

/**
 * Strategy for overriding default component weights on a per-tenant basis.
 *
 * Each property is a fractional weight (e.g. 0.4) and should collectively
 * sum to 1.0 when overrides are applied.
 */
export type WeightStrategy = Partial<Record<keyof typeof SCORE_WEIGHTS, number>>;

/**
 * Scoring context passed alongside inputs, used for cache key derivation
 * and future multi-tenant extensions.
 */
export interface ScoringContext {
  /** Tenant identifier for multi-tenant isolation. */
  tenantId: string;
  /** Logical job identifier; may be derived from job content hash. */
  jobId: string;
  /** Resume identifier for traceability; does not affect scoring. */
  resumeId: string;
  /** Optional weight overrides for this tenant or request. */
  weights?: WeightStrategy;
}

// Re-export input types for convenience and single import point.
export type { ResumeInput, JobInput };

