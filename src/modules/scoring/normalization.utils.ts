import { EDUCATION_LEVELS, MAX_KEYWORDS, MAX_PAYLOAD_BYTES } from '@/modules/scoring/scoring.constants';
import type { ScoreBreakdown, WeightStrategy } from '@/modules/scoring/scoring.types';

/**
 * Normalize a single keyword by trimming, lowercasing, and collapsing
 * internal whitespace.
 *
 * @param raw - Raw keyword input.
 * @returns Normalized keyword string.
 * @pure
 */
export function normalizeKeyword(raw: string): string {
  const trimmed = raw.trim().toLowerCase();

  // For short keyword strings this regex is safe and fast.
  // Avoids using /regex/g with .exec() in a loop on large payloads.
  return trimmed.replace(/\s+/g, ' ');
}

/**
 * Normalize an array of keywords and build a Set in a single O(n) pass.
 *
 * Caps processing at MAX_KEYWORDS to protect against malicious payloads.
 *
 * @param keywords - Array of raw keyword strings.
 * @param limit - Optional per-call keyword cap (defaults to MAX_KEYWORDS).
 * @returns Set of normalized, lowercased keywords.
 * @pure
 */
export function buildKeywordSet(keywords: string[], limit: number = MAX_KEYWORDS): Set<string> {
  const effectiveLimit = Math.min(limit, MAX_KEYWORDS);
  const set = new Set<string>();

  const count = Math.min(keywords.length, effectiveLimit);
  for (let i = 0; i < count; i += 1) {
    const normalized = normalizeKeyword(keywords[i]);
    if (normalized.length > 0) {
      set.add(normalized);
    }
  }

  return set;
}

/**
 * Compute the intersection of two Sets in O(min(a, b)).
 *
 * @param a - First keyword set.
 * @param b - Second keyword set.
 * @returns Array of intersecting elements.
 * @pure
 */
export function intersectSets(a: Set<string>, b: Set<string>): string[] {
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  const result: string[] = [];

  // Pre-allocation is avoided here because the final size is unknown,
  // but push operations on arrays are amortized O(1).
  for (const value of smaller) {
    if (larger.has(value)) {
      result.push(value);
    }
  }

  return result;
}

/**
 * Compute the set difference a \ b in O(|a|).
 *
 * @param a - Source set.
 * @param b - Elements to exclude.
 * @returns Array of elements in a but not in b.
 * @pure
 */
export function diffSets(a: Set<string>, b: Set<string>): string[] {
  const result: string[] = [];

  for (const value of a) {
    if (!b.has(value)) {
      result.push(value);
    }
  }

  return result;
}

/**
 * Safely truncate a string by byte length rather than character count.
 *
 * Uses Buffer.byteLength for accurate UTF-8 byte counting and ensures
 * the result does not exceed the specified byte budget.
 *
 * @param input - Input string to truncate.
 * @param maxBytes - Maximum allowed bytes (defaults to MAX_PAYLOAD_BYTES).
 * @returns Truncated string that fits within the byte budget.
 * @pure
 */
export function safeTruncate(input: string, maxBytes: number = MAX_PAYLOAD_BYTES): string {
  if (Buffer.byteLength(input, 'utf8') <= maxBytes) {
    return input;
  }

  let bytes = 0;
  let endIndex = 0;

  // Iterate code units and stop before exceeding maxBytes.
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const charBytes = Buffer.byteLength(char, 'utf8');

    if (bytes + charBytes > maxBytes) {
      break;
    }

    bytes += charBytes;
    endIndex = i + 1;
  }

  return input.slice(0, endIndex);
}

/**
 * Normalize education level strings to known EDUCATION_LEVELS keys.
 *
 * Returns 'none' as a safe fallback for unknown or malformed input.
 *
 * @param raw - Raw education level string.
 * @returns Normalized education level key.
 * @pure
 */
export function normalizeEducationLevel(raw: string): keyof typeof EDUCATION_LEVELS {
  const value = raw.trim().toLowerCase();

  // Direct match against known keys.
  if (value in EDUCATION_LEVELS) {
    return value as keyof typeof EDUCATION_LEVELS;
  }

  // Simple synonym mapping for robustness.
  if (value.includes('associate')) return 'associate';
  if (value.includes('bachelor') || value.includes('bsc') || value.includes('b.tech') || value.includes('be')) {
    return 'bachelor';
  }
  if (value.includes('master') || value.includes('msc') || value.includes('m.tech') || value.includes('ma')) {
    return 'master';
  }
  if (value.includes('phd') || value.includes('doctor')) {
    return 'phd';
  }

  return 'none';
}

/**
 * Build human-readable suggestion strings from score gaps and missing keywords.
 *
 * This function is intentionally heuristic but deterministic. It only
 * consumes the breakdown, missingKeywords, and weight configuration
 * to produce actionable improvement hints for candidates.
 *
 * @param breakdown - Component score breakdown.
 * @param missingKeywords - Normalized list of missing keywords.
 * @param weights - Effective weight strategy for this request.
 * @returns Array of suggestion strings.
 * @pure
 */
export function buildSuggestions(
  breakdown: ScoreBreakdown,
  missingKeywords: string[],
  weights: WeightStrategy,
): string[] {
  const suggestions: string[] = [];

  const effectiveWeights: WeightStrategy = { ...weights };

  // Skills
  if (breakdown.skillScore < 80 && (effectiveWeights.skill ?? 0) > 0) {
    suggestions.push(
      'Highlight more of the required skills in your resume, ensuring terminology matches the job description.',
    );
  }

  if (missingKeywords.length > 0) {
    const sampleMissing = missingKeywords.slice(0, 5).join(', ');
    suggestions.push(
      `Consider adding experience or keywords related to: ${sampleMissing}. Only include items that genuinely reflect your background.`,
    );
  }

  // Experience
  if (breakdown.experienceScore < 80 && (effectiveWeights.experience ?? 0) > 0) {
    suggestions.push(
      'Emphasize roles and achievements that demonstrate years of experience relevant to this position.',
    );
  }

  // Education
  if (breakdown.educationScore < 80 && (effectiveWeights.education ?? 0) > 0) {
    suggestions.push(
      'Clarify your highest education level and ensure your degree information is clearly listed in the education section.',
    );
  }

  // Completeness
  if (breakdown.completenessScore < 100 && (effectiveWeights.completeness ?? 0) > 0) {
    suggestions.push(
      'Complete all core sections of your resume, including skills, experience, education, and a concise professional summary.',
    );
  }

  // Bonus items
  if (breakdown.bonusScore < 100 && (effectiveWeights.bonus ?? 0) > 0) {
    suggestions.push(
      'Add relevant certifications, projects, publications, or awards to unlock additional bonus score and stand out.',
    );
  }

  return suggestions;
}

