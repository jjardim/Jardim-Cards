/**
 * Shared card valuation input — one path for portfolio, watchlist, card detail.
 * Always resolve grade + pass pricecharting_id here; never duplicate field mapping
 * in screen files.
 */
import { extractGrade } from "./parsing/grade";
import type { PortfolioCard, WatchlistCard } from "./types";

type ValuationGradeCheck = {
  gradeTierUsed: string | null;
  usedRawFallback: boolean;
};

export interface CardValuationInput {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  grade?: string | null;
  image_url?: string | null;
  ebay_title?: string | null;
  id?: string;
  pricecharting_id?: string | null;
}

export interface ValuationFetchOptions {
  forceRefresh?: boolean;
}

type GradeHint = { grade?: string | null; ebay_title?: string | null };

export type ValuationCardSource = Pick<
  PortfolioCard | WatchlistCard,
  | "player_name"
  | "set_name"
  | "year"
  | "card_number"
  | "grade"
  | "image_url"
  | "ebay_title"
  | "pricecharting_id"
> & { id?: string };

/** Stored grade, or parsed from the saved eBay listing title. */
export function resolveCardGrade(card: GradeHint): string | null {
  const stored = card.grade?.trim();
  if (stored) return stored;
  return extractGrade(card.ebay_title) ?? null;
}

export function hasRequestedGrade(grade: string | null | undefined): boolean {
  const g = grade?.trim();
  return !!g && !/raw|ungraded/i.test(g);
}

/** Checklist / team-set rows often OCR as "1986-1987 Checklist" — normalize for search. */
export function normalizePlayerNameForSearch(playerName: string): string {
  const trimmed = playerName.trim();
  if (/checklist/i.test(trimmed)) return "Checklist";
  return trimmed;
}

/** Reject raw-tier valuations when the owned card is graded (slab). */
export function valuationHonorsGrade(
  valuation: ValuationGradeCheck | null | undefined,
  grade: string | null | undefined
): boolean {
  if (!valuation) return false;
  if (!hasRequestedGrade(grade)) return true;
  if (valuation.usedRawFallback) return false;
  if (valuation.gradeTierUsed === "Raw") return false;
  return true;
}

/** Map any portfolio/watchlist row → unified valuation fetch input. */
export function toValuationInput(card: ValuationCardSource): CardValuationInput {
  return {
    player_name: normalizePlayerNameForSearch(card.player_name),
    set_name: card.set_name,
    year: card.year,
    card_number: card.card_number,
    grade: resolveCardGrade(card),
    image_url: card.image_url,
    ebay_title: card.ebay_title,
    id: card.id,
    pricecharting_id: card.pricecharting_id,
  };
}
