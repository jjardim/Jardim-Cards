import type { PortfolioCard } from "./types";
import type { PortfolioValuation } from "./api";
import { NEAR_TARGET_BUFFER_PCT } from "./user-preferences";

export type PortfolioFilter =
  | "all"
  | "gainers"
  | "losers"
  | "ready_to_sell"
  | "near_target";

export interface PortfolioCardMetrics {
  plPct: number | null;
  plCents: number | null;
  hasValuation: boolean;
}

export function computePortfolioCardMetrics(
  card: PortfolioCard,
  valuation: PortfolioValuation | null | undefined
): PortfolioCardMetrics {
  if (!valuation) {
    return { plPct: null, plCents: null, hasValuation: false };
  }

  const paidCents = card.purchase_price_cents * card.quantity;
  const currentCents = valuation.currentValueCents * card.quantity;
  const plCents = currentCents - paidCents;
  const plPct = paidCents > 0 ? (plCents / paidCents) * 100 : null;

  return { plPct, plCents, hasValuation: true };
}

function compareNullableDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

function compareNullableAsc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

export function filterPortfolioCards(
  cards: PortfolioCard[],
  valuations: Record<string, PortfolioValuation | null | undefined>,
  filter: PortfolioFilter,
  targetProfitPct: number
): PortfolioCard[] {
  const withMetrics = cards.map((card) => ({
    card,
    metrics: computePortfolioCardMetrics(card, valuations[card.id]),
  }));

  let filtered = withMetrics;

  switch (filter) {
    case "gainers":
      filtered = withMetrics.filter((row) => row.metrics.plPct != null && row.metrics.plPct > 0);
      break;
    case "losers":
      filtered = withMetrics.filter((row) => row.metrics.plPct != null && row.metrics.plPct < 0);
      break;
    case "ready_to_sell":
      filtered = withMetrics.filter(
        (row) => row.metrics.plPct != null && row.metrics.plPct >= targetProfitPct
      );
      break;
    case "near_target": {
      const floor = targetProfitPct - NEAR_TARGET_BUFFER_PCT;
      filtered = withMetrics.filter(
        (row) =>
          row.metrics.plPct != null &&
          row.metrics.plPct >= floor &&
          row.metrics.plPct < targetProfitPct
      );
      break;
    }
    case "all":
    default:
      break;
  }

  const sorted = [...filtered];
  switch (filter) {
    case "gainers":
      sorted.sort((a, b) => compareNullableDesc(a.metrics.plPct, b.metrics.plPct));
      break;
    case "losers":
      sorted.sort((a, b) => compareNullableAsc(a.metrics.plPct, b.metrics.plPct));
      break;
    case "ready_to_sell":
    case "near_target":
      sorted.sort((a, b) => compareNullableDesc(a.metrics.plPct, b.metrics.plPct));
      break;
    case "all":
    default:
      break;
  }

  return sorted.map((row) => row.card);
}

export function countPortfolioFilterMatches(
  cards: PortfolioCard[],
  valuations: Record<string, PortfolioValuation | null | undefined>,
  filter: PortfolioFilter,
  targetProfitPct: number
): number {
  if (filter === "all") return cards.length;
  return filterPortfolioCards(cards, valuations, filter, targetProfitPct).length;
}
