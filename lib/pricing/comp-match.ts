/**
 * Comp matching — grade-tier pricing + sold-listing filters + match confidence.
 *
 * Every portfolio valuation should expose how closely comps match the owned card.
 * See `.cursor/rules/product-vision.mdc`.
 */
import { extractGrade } from "../parsing/grade";
import type { CompMatchLevel, ValuationPriceSource } from "../types";

/** Minimal sold listing shape used for comp filtering (avoids circular import with api.ts). */
export interface CompListing {
  title: string;
  priceCents: number;
  date: string;
  imageUrl: string | null;
  ebayUrl: string;
}

export interface GradeTierPrices {
  rawCents: number | null;
  psa7Cents: number | null;
  psa8Cents: number | null;
  psa9Cents: number | null;
  psa10Cents: number | null;
  bgs95Cents: number | null;
  bgs10Cents: number | null;
  cgc10Cents: number | null;
  sgc10Cents: number | null;
}

export interface GradeTierPriceResult {
  priceCents: number | null;
  /** Human label: "PSA 9", "Raw", etc. */
  gradeTierUsed: string;
  requestedGrade: string | null;
  /** True when a graded card fell back to raw/ungraded price. */
  usedRawFallback: boolean;
}

export interface CardCompCriteria {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  grade?: string | null;
}

function normalizeGradeToken(grade: string): string {
  return grade.trim().replace(/\s+/g, " ").toUpperCase();
}

function gradesMatch(requested: string, found: string): boolean {
  return normalizeGradeToken(requested) === normalizeGradeToken(found);
}

/** Minimum / maximum recent sold comps for a grade-exact headline average. */
export const RECENT_COMP_MIN = 3;
export const RECENT_COMP_MAX = 6;

export interface RecentCompAverageResult {
  priceCents: number;
  /** How many sold listings were averaged (3–6). */
  compCount: number;
  compsUsed: CompListing[];
}

/**
 * Median of the most recent 3–6 sold listings with the **exact same grader + grade**
 * (PSA 9 ≠ PSA 10 ≠ CGC 9). Does not mix grading companies — see GRADER_TO_PSA_NOTE.
 */
export function computeRecentCompAverage(
  listings: CompListing[],
  requestedGrade: string,
  minComps: number = RECENT_COMP_MIN
): RecentCompAverageResult | null {
  const exact = listings.filter((l) => {
    const parsed = extractGrade(l.title);
    if (parsed) return gradesMatch(requestedGrade, parsed);
    return l.title.toLowerCase().includes(requestedGrade.toLowerCase());
  });

  const sorted = [...exact].sort((a, b) => b.date.localeCompare(a.date));
  const window = filterCompOutliers(sorted.slice(0, RECENT_COMP_MAX));
  if (window.length < minComps) return null;

  const prices = window.map((l) => l.priceCents).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 === 0
      ? Math.round((prices[mid - 1] + prices[mid]) / 2)
      : prices[mid];

  return { priceCents: median, compCount: window.length, compsUsed: window };
}

function medianPriceCents(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/** Drop lot listings and other obvious outliers before averaging or linking. */
export function filterCompOutliers(listings: CompListing[]): CompListing[] {
  if (listings.length === 0) return listings;

  const prices = listings.map((l) => l.priceCents);
  const median = medianPriceCents(prices);
  const cap = Math.max(median * 4, 50_000);

  return listings.filter((l) => l.priceCents <= cap);
}

/** Highest-priced similar comp; ties broken by most recent sale date. */
export function pickTopCompListing(
  listings: CompListing[],
  requestedGrade?: string | null
): CompListing | null {
  const eligible = pickCompPool(listings, requestedGrade);
  if (eligible.length === 0) return null;

  return eligible.reduce((best, current) => {
    if (current.priceCents > best.priceCents) return current;
    if (current.priceCents === best.priceCents && current.date.localeCompare(best.date) > 0) {
      return current;
    }
    return best;
  });
}

function pickCompPool(listings: CompListing[], requestedGrade?: string | null): CompListing[] {
  let pool = listings;
  if (requestedGrade?.trim() && !/raw|ungraded/i.test(requestedGrade)) {
    const { gradeMatched } = filterSoldListingsByComp(
      listings,
      { player_name: "", grade: requestedGrade }
    );
    if (gradeMatched.length > 0) pool = gradeMatched;
  }
  return filterCompOutliers(pool).filter((l) => l.ebayUrl?.trim());
}

/** Most recent similar sold comp (by sale date). */
export function pickLastCompListing(
  listings: CompListing[],
  requestedGrade?: string | null
): CompListing | null {
  const pool = pickCompPool(listings, requestedGrade);
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => b.date.localeCompare(a.date))[0];
}

/**
 * Reference multipliers: approximate PSA-equivalent if we ever normalize cross-grader
 * comps (NOT used for headline price — exact grader match only per product spec).
 * Sources: general market consensus that PSA > BGS > CGC/SGC at same numeric grade.
 */
export const GRADER_TO_PSA_EQUIVALENT: Record<string, number> = {
  PSA: 1.0,
  "BGS 10": 0.98,
  "BGS 9.5": 0.93,
  "BGS 9": 0.86,
  "CGC 10": 0.9,
  "CGC 9": 0.84,
  "SGC 10": 0.92,
  "SGC 9": 0.86,
};

/** Convert a non-PSA sold price to rough PSA-equivalent (research / dev only). */
export function toPsaEquivalentCents(salePriceCents: number, foundGrade: string): number {
  const key = normalizeGradeToken(foundGrade);
  const multiplier = GRADER_TO_PSA_EQUIVALENT[key] ?? 0.85;
  return Math.round(salePriceCents / multiplier);
}

/**
 * Map a card's grade to the matching PriceCharting tier price.
 * Graded cards never silently use raw when the tier price exists.
 * Returns null price when a graded tier is requested but unavailable.
 */
export function resolveGradeTierPrice(
  prices: GradeTierPrices,
  grade: string | null | undefined
): GradeTierPriceResult {
  const requestedGrade = grade?.trim() || null;
  const isRawRequest =
    !requestedGrade || requestedGrade === "" || /raw|ungraded/i.test(requestedGrade);

  if (isRawRequest) {
    return {
      priceCents: prices.rawCents,
      gradeTierUsed: "Raw",
      requestedGrade,
      usedRawFallback: false,
    };
  }

  const g = requestedGrade;
  let tierPrice: number | null = null;
  let tierLabel = requestedGrade;

  if (/psa\s*10/i.test(g)) {
    tierPrice = prices.psa10Cents;
    tierLabel = "PSA 10";
  } else if (/psa\s*9(?!\.5)/i.test(g)) {
    tierPrice = prices.psa9Cents;
    tierLabel = "PSA 9";
  } else if (/psa\s*8/i.test(g)) {
    tierPrice = prices.psa8Cents;
    tierLabel = "PSA 8";
  } else if (/psa\s*7/i.test(g)) {
    tierPrice = prices.psa7Cents;
    tierLabel = "PSA 7";
  } else if (/psa\s*6/i.test(g)) {
    tierLabel = "PSA 6";
  } else if (/psa\s*5/i.test(g)) {
    tierLabel = "PSA 5";
  } else if (/bgs\s*10/i.test(g)) {
    tierPrice = prices.bgs10Cents ?? prices.psa10Cents;
    tierLabel = "BGS 10";
  } else if (/bgs\s*9\.?5/i.test(g)) {
    tierPrice = prices.bgs95Cents ?? prices.psa9Cents;
    tierLabel = "BGS 9.5";
  } else if (/bgs\s*9(?!\.)/i.test(g)) {
    tierPrice = prices.psa9Cents;
    tierLabel = "BGS 9";
  } else if (/sgc\s*10/i.test(g)) {
    tierPrice = prices.sgc10Cents ?? prices.psa10Cents;
    tierLabel = "SGC 10";
  } else if (/cgc\s*10/i.test(g)) {
    tierPrice = prices.cgc10Cents ?? prices.psa10Cents;
    tierLabel = "CGC 10";
  }

  if (tierPrice && tierPrice > 0) {
    return {
      priceCents: tierPrice,
      gradeTierUsed: tierLabel,
      requestedGrade,
      usedRawFallback: false,
    };
  }

  // Graded tier with no PC catalog price (e.g. PSA 6) — never substitute raw.
  return {
    priceCents: null,
    gradeTierUsed: tierLabel,
    requestedGrade,
    usedRawFallback: false,
  };
}

function titleMatchesSet(title: string, setName: string): boolean {
  const setLower = setName.toLowerCase();
  if (title.toLowerCase().includes(setLower)) return true;
  // Match variant keywords stripped from set (e.g. "Tiffany" in "Topps Tiffany")
  const tokens = setLower.split(/\s+/).filter((t) => t.length > 2);
  return tokens.some((t) => title.toLowerCase().includes(t));
}

function titleMatchesCardNumber(title: string, cardNumber: string): boolean {
  const num = cardNumber.replace(/^#/, "").trim();
  if (!num) return true;
  return new RegExp(`#\\s*${num}\\b`, "i").test(title) || new RegExp(`\\b${num}\\b`).test(title);
}

/**
 * Filter sold listings toward the owned card identity. Grade filter is strict:
 * when the card is graded and no title matches that grade, returns [] rather
 * than blending raw comps.
 */
export function filterSoldListingsByComp(
  listings: CompListing[],
  criteria: CardCompCriteria
): { gradeMatched: CompListing[]; approximate: CompListing[] } {
  let pool = listings;

  if (criteria.set_name) {
    const bySet = pool.filter((l) => titleMatchesSet(l.title, criteria.set_name!));
    if (bySet.length > 0) pool = bySet;
  }

  if (criteria.card_number) {
    const byNum = pool.filter((l) => titleMatchesCardNumber(l.title, criteria.card_number!));
    if (byNum.length > 0) pool = byNum;
  }

  const requestedGrade = criteria.grade?.trim();
  if (!requestedGrade || /raw|ungraded/i.test(requestedGrade)) {
    return { gradeMatched: pool, approximate: pool };
  }

  const gradeMatched = pool.filter((l) => {
    const parsed = extractGrade(l.title);
    if (parsed) return gradesMatch(requestedGrade, parsed);
    return l.title.toLowerCase().includes(requestedGrade.toLowerCase());
  });

  return { gradeMatched, approximate: pool };
}

export function computePcMatchLevel(
  hasProductId: boolean,
  tier: GradeTierPriceResult,
  gradeSpecificCompCount: number
): CompMatchLevel {
  if (tier.usedRawFallback) return "approximate";
  if (hasProductId && tier.priceCents && !tier.usedRawFallback) return "exact";
  if (gradeSpecificCompCount >= 3) return "exact";
  if (gradeSpecificCompCount >= 1) return "grade";
  if (tier.priceCents) return "grade";
  return "stale";
}

export function computeEbayMatchLevel(
  gradeMatchedCount: number,
  approximateCount: number,
  hasRequestedGrade: boolean
): CompMatchLevel {
  if (hasRequestedGrade) {
    if (gradeMatchedCount >= 3) return "exact";
    if (gradeMatchedCount >= 1) return "grade";
    if (approximateCount >= 1) return "approximate";
    return "stale";
  }
  if (approximateCount >= 3) return "exact";
  if (approximateCount >= 1) return "grade";
  return "stale";
}

export function buildMatchLabel(
  matchLevel: CompMatchLevel,
  priceSource: ValuationPriceSource,
  gradeTierUsed: string | null,
  compCountGradeSpecific: number,
  catalogVolume: number | null
): string {
  const tier = gradeTierUsed ? `${gradeTierUsed} · ` : "";
  const source =
    priceSource === "pricecharting"
      ? "PC catalog"
      : priceSource === "ebay_sold"
        ? "eBay sold"
        : "eBay active";

  switch (matchLevel) {
    case "exact":
      return `${tier}${source}${compCountGradeSpecific > 0 ? ` · ${compCountGradeSpecific} comps` : ""}`;
    case "grade":
      return `${tier}${compCountGradeSpecific} comp${compCountGradeSpecific === 1 ? "" : "s"} · thin data`;
    case "approximate":
      return `Approximate · ${tier || "mixed comps"}`;
    case "stale":
      return "No recent comps at this grade";
    default:
      return source;
  }
}

/** User-facing sales / volume line under market value. */
export function formatCompStatsLabel(v: {
  priceSource: ValuationPriceSource;
  compCountGradeSpecific: number;
  catalogVolume: number | null;
  gradeTierUsed: string | null;
  numSales: number;
}): string {
  if (v.priceSource === "pricecharting") {
    const parts: string[] = [];
    if (v.compCountGradeSpecific > 0 && v.gradeTierUsed) {
      parts.push(`${v.compCountGradeSpecific} ${v.gradeTierUsed} comps`);
    }
    if (v.catalogVolume != null && v.catalogVolume > 0) {
      parts.push(`PC vol ${v.catalogVolume.toLocaleString()}`);
    }
    return parts.length > 0 ? parts.join(" · ") : "PC catalog price";
  }
  if (v.compCountGradeSpecific > 0 && v.gradeTierUsed) {
    return `${v.compCountGradeSpecific} ${v.gradeTierUsed} sold comps`;
  }
  const n = v.compCountGradeSpecific > 0 ? v.compCountGradeSpecific : v.numSales;
  const tier = v.gradeTierUsed ? ` ${v.gradeTierUsed}` : "";
  return `${n}${tier} sold comps`;
}
