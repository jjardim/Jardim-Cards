/**
 * Dev-only valuation comparison logs — PriceCharting vs eBay.
 *
 * Enable: __DEV__ and EXPO_PUBLIC_VALUATION_DEV_LOG !== "false"
 * Disable: set EXPO_PUBLIC_VALUATION_DEV_LOG=false in .env
 *
 * Use while building to decide which source is more accurate per card/grade.
 * Not for production analytics — console only.
 */
import type { CardValuationInput } from "../valuation";
import type { CompMatchLevel, ValuationPriceSource } from "../types";
import { formatCents } from "../utils";

/** Minimal shape for logging — matches PortfolioValuation fields we care about. */
export interface ValuationLogSource {
  currentValueCents: number;
  priceSource: ValuationPriceSource;
  gradeTierUsed: string | null;
  matchLevel: CompMatchLevel;
  matchLabel: string;
  usedRawFallback: boolean;
  compCountGradeSpecific: number;
  numSales: number;
  trend7dPct: number | null;
  trend30dPct: number | null;
}

export function isValuationDevLogEnabled(): boolean {
  if (typeof __DEV__ === "undefined" || !__DEV__) return false;
  return process.env.EXPO_PUBLIC_VALUATION_DEV_LOG !== "false";
}

export interface ValuationLogSnapshot {
  source: ValuationPriceSource;
  path: string;
  valueCents: number | null;
  valueLabel: string;
  gradeTierUsed: string | null;
  matchLevel: CompMatchLevel | null;
  matchLabel: string | null;
  usedRawFallback: boolean;
  compCountGradeSpecific: number;
  numSales: number;
  trend7dPct: number | null;
  trend30dPct: number | null;
}

export function valuationToLogSnapshot(
  valuation: ValuationLogSource | null | undefined,
  path: string
): ValuationLogSnapshot | null {
  if (!valuation || valuation.currentValueCents <= 0) return null;

  return {
    source: valuation.priceSource,
    path,
    valueCents: valuation.currentValueCents,
    valueLabel: formatCents(valuation.currentValueCents),
    gradeTierUsed: valuation.gradeTierUsed,
    matchLevel: valuation.matchLevel,
    matchLabel: valuation.matchLabel,
    usedRawFallback: valuation.usedRawFallback,
    compCountGradeSpecific: valuation.compCountGradeSpecific,
    numSales: valuation.numSales,
    trend7dPct: valuation.trend7dPct,
    trend30dPct: valuation.trend30dPct,
  };
}

function pctDiff(a: number, b: number): string {
  if (a === 0) return "—";
  const pct = ((b - a) / a) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function logValuationCompare(params: {
  input: CardValuationInput;
  query: string;
  pricecharting: ValuationLogSnapshot | null;
  ebay: ValuationLogSnapshot | null;
  chosen: ValuationPriceSource | "cache" | "mock" | "none";
  note?: string;
}): void {
  if (!isValuationDevLogEnabled()) return;

  const { input, query, pricecharting, ebay, chosen, note } = params;
  const grade = input.grade?.trim() || "Raw";
  const title = `[valuation] ${input.player_name} · ${grade}`;

  const rows = [
    pricecharting
      ? { provider: "PriceCharting (paid)", ...pricecharting }
      : { provider: "PriceCharting (paid)", valueLabel: "—", path: "miss", matchLabel: "no result" },
    ebay
      ? { provider: "eBay sold", ...ebay }
      : { provider: "eBay sold", valueLabel: "—", path: "miss", matchLabel: "no result" },
  ];

  const pcCents = pricecharting?.valueCents ?? null;
  const ebayCents = ebay?.valueCents ?? null;
  let spread = "";
  if (pcCents != null && ebayCents != null) {
    spread = `spread: ${formatCents(Math.abs(pcCents - ebayCents))} (eBay vs PC ${pctDiff(pcCents, ebayCents)})`;
  }

  console.groupCollapsed(title);
  console.log("query:", query);
  if (input.pricecharting_id) console.log("pricecharting_id:", input.pricecharting_id);
  console.log("chosen:", chosen, note ? `· ${note}` : "");
  if (spread) console.log(spread);
  console.table(rows);
  if (pricecharting?.usedRawFallback) {
    console.warn("PC used raw fallback — graded tier missing on catalog product");
  }
  if (ebay && pricecharting && ebay.gradeTierUsed !== pricecharting.gradeTierUsed) {
    console.warn(
      `Grade tier mismatch: PC=${pricecharting.gradeTierUsed ?? "?"} vs eBay=${ebay.gradeTierUsed ?? "?"}`
    );
  }
  console.groupEnd();
}

export function logValuationCacheHit(params: {
  input: CardValuationInput;
  query: string;
  valuation: ValuationLogSource;
}): void {
  if (!isValuationDevLogEnabled()) return;

  const snap = valuationToLogSnapshot(params.valuation, "cache");
  if (!snap) return;

  console.log(
    `[valuation:cache] ${params.input.player_name} · ${snap.valueLabel} · ${snap.source} · ${snap.matchLabel}`
  );
}
