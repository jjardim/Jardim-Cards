/**
 * Grade parsing utilities.
 *
 * Historically we had three separate regexes scattered across `card-parser.ts`,
 * `api.ts`, and `EditCardModal.tsx` to detect/strip grader annotations. They
 * drifted (the one in `api.ts` even greedily ate more than it should), leading
 * to lost grade info on search results. This module is the single source of
 * truth for anything that recognises a grade string.
 *
 * Supported companies: PSA, BGS, SGC, CGC, plus the common "GEM MINT 10"
 * long-form variant. Numeric grade is 1-10 with optional half step (e.g. 9.5).
 */

/**
 * Canonical pattern for a grade token in a freeform string. Use `extractGrade`
 * / `stripGrade` rather than matching directly so call sites stay consistent.
 *
 * The `g` flag is intentional so `stripGrade` can remove every occurrence.
 */
const GRADE_PATTERN = /\b(PSA|BGS|SGC|CGC)\s*(?:gem\s*mint|mint|near\s*mint|nm-mt|nm|graded)?\s*(10|[1-9](?:\.\d)?)\b/gi;

/** Long-form "GEM MINT 10" pattern, used as a fallback when no grader prefix is present. */
const GEM_MINT_PATTERN = /\bgem\s*mint\s*(10|[1-9](?:\.\d)?)\b/gi;

/**
 * Extract a canonical grade string from freeform text, e.g. "PSA 10", "BGS 9.5".
 * Returns `null` when no graded annotation is present.
 *
 * Falls back to `"GEM MINT 10"` when only a long-form annotation is present
 * (common in eBay titles for unlabelled PSA 10s).
 */
export function extractGrade(text: string | null | undefined): string | null {
  if (!text) return null;

  GRADE_PATTERN.lastIndex = 0;
  const match = GRADE_PATTERN.exec(text);
  if (match) {
    const company = match[1].toUpperCase();
    const score = match[2];
    return `${company} ${score}`;
  }

  GEM_MINT_PATTERN.lastIndex = 0;
  const gem = GEM_MINT_PATTERN.exec(text);
  if (gem) return `GEM MINT ${gem[1]}`;

  return null;
}

/**
 * Remove all grade tokens from a string. Used when cleaning titles for
 * downstream parsers (player name, set name) so they don't trip over
 * "PSA 10" fragments.
 */
export function stripGrade(text: string): string {
  return text.replace(GRADE_PATTERN, " ").replace(GEM_MINT_PATTERN, " ").replace(/\s{2,}/g, " ").trim();
}

/** Slab graders supported in the grade picker and comp matching. */
export const GRADING_COMPANIES = ["PSA", "BGS", "CGC", "SGC"] as const;
export type GradingCompany = (typeof GRADING_COMPANIES)[number];

/** Numeric tiers offered per company in the grade picker. */
export const GRADE_SCORES: Record<GradingCompany, readonly string[]> = {
  PSA: ["10", "9", "8", "7", "6", "5"],
  BGS: ["10", "9.5", "9", "8.5", "8", "7"],
  CGC: ["10", "9.5", "9", "8.5", "8", "7"],
  SGC: ["10", "9.5", "9", "8", "7"],
};

export interface GradeSelection {
  kind: "raw" | "graded";
  company?: GradingCompany;
  score?: string;
}

function isGradingCompany(value: string): value is GradingCompany {
  return (GRADING_COMPANIES as readonly string[]).includes(value);
}

/**
 * Parse a stored grade string into picker state. Ungraded cards and unknown
 * strings map to `{ kind: "raw" }`.
 */
export function parseGradeSelection(grade: string | null | undefined): GradeSelection {
  const trimmed = grade?.trim() ?? "";
  if (!trimmed || /^raw$/i.test(trimmed)) return { kind: "raw" };

  const extracted = extractGrade(trimmed);
  if (extracted) {
    if (/^GEM MINT/i.test(extracted)) {
      const score = extracted.replace(/^GEM MINT\s*/i, "");
      return { kind: "graded", company: "PSA", score };
    }
    const [company, score] = extracted.split(" ");
    if (company && score && isGradingCompany(company)) {
      return { kind: "graded", company, score };
    }
  }

  return { kind: "raw" };
}

/** Canonical grade token for API/DB — empty string means ungraded/raw. */
export function formatGradeToken(selection: GradeSelection): string {
  if (selection.kind === "raw" || !selection.company || !selection.score) return "";
  return `${selection.company} ${selection.score}`;
}

export interface GradeParts {
  company: GradingCompany | null;
  score: string | null;
  label: string;
}

/** Split "PSA 9" into company + score for display badges. */
export function parseGradeParts(grade: string | null | undefined): GradeParts {
  const trimmed = grade?.trim() ?? "";
  if (!trimmed) return { company: null, score: null, label: "Raw" };

  const extracted = extractGrade(trimmed);
  const token = extracted ?? trimmed;
  if (/^GEM MINT/i.test(token)) {
    const score = token.replace(/^GEM MINT\s*/i, "");
    return { company: "PSA", score, label: token };
  }

  const match = token.match(/^(PSA|BGS|SGC|CGC)\s+(.+)$/i);
  if (match && isGradingCompany(match[1].toUpperCase())) {
    const company = match[1].toUpperCase() as GradingCompany;
    return { company, score: match[2], label: `${company} ${match[2]}` };
  }

  return { company: null, score: null, label: token };
}

