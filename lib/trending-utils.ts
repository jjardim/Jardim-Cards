import type { MarketMover } from "@/lib/types";
import { generateSearchKey } from "./utils";

export interface PriceTierFilter {
  min: number;
  max: number;
}

/** Dedupe by searchKey (keep highest volume) and apply optional price tier filter. */
export function processTrendingCards(
  trending: MarketMover[],
  tier: PriceTierFilter
): MarketMover[] {
  const bySearchKey = new Map<string, MarketMover>();
  for (const c of trending) {
    const existing = bySearchKey.get(c.searchKey);
    if (!existing || c.numSales > existing.numSales) bySearchKey.set(c.searchKey, c);
  }
  let items = Array.from(bySearchKey.values());
  if (tier.min > 0 || tier.max < Infinity) {
    items = items.filter((c) => c.avgPriceCents >= tier.min && c.avgPriceCents <= tier.max);
  }
  return items;
}

export function pickTopGainer(items: MarketMover[]): MarketMover | null {
  const gainers = items.filter(
    (c): c is MarketMover & { trend7dPct: number } => c.trend7dPct !== null && c.trend7dPct > 0
  );
  if (gainers.length === 0) return null;
  return gainers.sort((a, b) => b.trend7dPct - a.trend7dPct)[0];
}

export function splitTrendLists(items: MarketMover[]) {
  const withTrend = items.filter(
    (c): c is MarketMover & { trend7dPct: number } => c.trend7dPct !== null
  );
  const gainers = withTrend
    .filter((c) => c.trend7dPct > 0)
    .sort((a, b) => b.trend7dPct - a.trend7dPct);
  const losers = withTrend
    .filter((c) => c.trend7dPct < 0)
    .sort((a, b) => a.trend7dPct - b.trend7dPct);
  return { withTrend, gainers, losers };
}

export const WORTH_WATCHING_MIN_SALES = 3;
export const WORTH_WATCHING_PER_CATEGORY = 5;
export const WORTH_WATCHING_POOL_SIZE = 48;
/** @deprecated use WORTH_WATCHING_PER_CATEGORY */
export const WORTH_WATCHING_LIMIT = 8;

export function moverWatchKey(card: MarketMover): string {
  return cardIdentityKey({
    searchKey: card.searchKey,
    grade: card.grade,
    player_name: card.playerName,
    set_name: card.setName,
    year: card.year,
  });
}

/** Normalized search_key from stored row or generated from player/set/year. */
export function resolveCardSearchKey(parts: {
  searchKey?: string | null;
  search_key?: string | null;
  player_name: string;
  set_name?: string | null;
  year?: number | null;
}): string {
  const searchKey = (parts.searchKey ?? parts.search_key)?.trim();
  if (searchKey) return searchKey;
  return generateSearchKey({
    year: parts.year,
    set_name: parts.set_name,
    player_name: parts.player_name,
  });
}

/** Card identity without grade — used to exclude anything you already own. */
export function cardCatalogKey(parts: {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
}): string {
  return generateSearchKey({
    year: parts.year,
    set_name: parts.set_name,
    player_name: parts.player_name,
  });
}

export function moverCatalogKey(card: MarketMover): string {
  return cardCatalogKey({
    player_name: card.playerName,
    set_name: card.setName,
    year: card.year,
  });
}

export function cardIdentityKey(parts: {
  searchKey?: string | null;
  search_key?: string | null;
  grade?: string | null;
  player_name: string;
  set_name?: string | null;
  year?: number | null;
}): string {
  const searchKey = (parts.searchKey ?? parts.search_key)?.trim();
  const sk =
    searchKey ||
    generateSearchKey({
      year: parts.year,
      set_name: parts.set_name,
      player_name: parts.player_name,
    });
  return `${sk}:${parts.grade ?? ""}`;
}

/** Top 7d gainers with enough comp volume — deduped per searchKey + grade. */
export function pickWorthWatchingCards(
  items: MarketMover[],
  options?: {
    /** Grade-specific keys (watchlist). */
    excludeIdentityKeys?: ReadonlySet<string>;
    /** Player/set/year keys — any owned grade excludes the card. */
    excludeCatalogKeys?: ReadonlySet<string>;
    /** @deprecated use excludeIdentityKeys */
    excludeKeys?: ReadonlySet<string>;
    limit?: number;
  }
): MarketMover[] {
  const limit = options?.limit ?? WORTH_WATCHING_LIMIT;
  const identityExcludes = options?.excludeIdentityKeys ?? options?.excludeKeys;
  const byKey = new Map<string, MarketMover>();
  for (const c of items) {
    const key = moverWatchKey(c);
    const existing = byKey.get(key);
    if (!existing || c.numSales > existing.numSales) byKey.set(key, c);
  }
  return Array.from(byKey.values())
    .filter(
      (c): c is MarketMover & { trend7dPct: number } =>
        c.trend7dPct !== null && c.trend7dPct > 0 && c.numSales >= WORTH_WATCHING_MIN_SALES
    )
    .filter((c) => {
      if (identityExcludes?.has(moverWatchKey(c))) return false;
      if (options?.excludeCatalogKeys?.has(moverCatalogKey(c))) return false;
      return true;
    })
    .sort((a, b) => b.trend7dPct - a.trend7dPct)
    .slice(0, limit);
}

/** Top gainers per category, excluding cards the user already owns or tracks. */
export function pickWorthWatchingByCategory(
  items: MarketMover[],
  sports: readonly string[],
  options?: {
    excludeKeys?: ReadonlySet<string>;
    excludeCatalogKeys?: ReadonlySet<string>;
    perCategory?: number;
  }
): Record<string, MarketMover[]> {
  const perCategory = options?.perCategory ?? WORTH_WATCHING_PER_CATEGORY;
  const result: Record<string, MarketMover[]> = {};
  for (const sport of sports) {
    const picked = pickWorthWatchingCards(
      items.filter((c) => c.sport === sport),
      {
        excludeIdentityKeys: options?.excludeKeys,
        excludeCatalogKeys: options?.excludeCatalogKeys,
        limit: perCategory,
      }
    );
    if (picked.length > 0) result[sport] = picked;
  }
  return result;
}
