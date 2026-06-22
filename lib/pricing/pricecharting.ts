/**
 * SportsCardsPro / PriceCharting pricing adapter.
 *
 * Replaces the eBay title-parsing + variant-fallback path in `fetchPortfolioValuation`
 * with a structured catalog lookup. Sold-listings / recent-sales arrays are still
 * sourced from the `sold_listings` table (populated by the eBay pipeline) since
 * PriceCharting only returns aggregate prices, not individual transactions.
 *
 * Gated by USE_PRICECHARTING in lib/api.ts so we can A/B against the eBay path.
 */

import { supabase } from "../supabase";
import type { PortfolioValuation, SoldListing } from "../api";
import type { Sport } from "../types";
import { SPORTS } from "../types";
import {
  buildMatchLabel,
  computePcMatchLevel,
  computeRecentCompAverage,
  filterSoldListingsByComp,
  filterCompOutliers,
  RECENT_COMP_MIN,
  resolveGradeTierPrice,
} from "./comp-match";

export interface PriceChartingCard {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  grade?: string | null;
  /** Portfolio card id, used to cache pricecharting_id back to the DB. */
  id?: string;
  /** Cached PriceCharting product ID — skips fuzzy search when present. */
  pricecharting_id?: string | null;
}

interface NormalizedPrices {
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

interface NormalizedProduct {
  id: string;
  productName: string;
  consoleName: string;
  genre: string | null;
  upc: string | null;
  releaseDate: string | null;
  prices: NormalizedPrices;
  retail: {
    rawBuyCents: number | null;
    rawSellCents: number | null;
    psa7BuyCents: number | null;
    psa7SellCents: number | null;
    psa8BuyCents: number | null;
    psa8SellCents: number | null;
  };
  salesVolume: number | null;
}

type EdgeResponse =
  | { status: "success"; product: NormalizedProduct; message?: string | null }
  | { status: "success"; products: NormalizedProduct[]; message?: string | null }
  | { status: "not_found"; product?: null; products?: NormalizedProduct[]; message?: string | null };

interface SoldListingRow {
  title: string;
  sold_price_cents: number;
  sold_date: string;
  image_url: string | null;
  ebay_url: string;
}

function cleanSetName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\b(19[5-9]\d|20[0-2]\d)\b/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

function buildSearchQuery(card: PriceChartingCard): string {
  return [
    card.year?.toString(),
    cleanSetName(card.set_name),
    card.player_name,
    card.card_number ? `#${card.card_number}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

async function lookupProduct(card: PriceChartingCard): Promise<NormalizedProduct | null> {
  if (card.pricecharting_id) {
    const { data, error } = await supabase.functions.invoke<EdgeResponse>("pricecharting-lookup", {
      body: { id: card.pricecharting_id },
    });
    if (!error && data?.status === "success" && "product" in data && data.product) {
      return data.product;
    }
  }

  const q = buildSearchQuery(card);
  if (!q) return null;

  const { data, error } = await supabase.functions.invoke<EdgeResponse>("pricecharting-lookup", {
    body: { action: "search", q },
  });

  if (error || !data || data.status !== "success") return null;
  const products = "products" in data ? data.products : [];
  return products[0] ?? null;
}

async function cachePriceChartingId(portfolioCardId: string, pricechartingId: string) {
  await supabase
    .from("portfolio_cards")
    .update({ pricecharting_id: pricechartingId })
    .eq("id", portfolioCardId);
}

function mapSoldListingRows(data: SoldListingRow[]): SoldListing[] {
  return data.map((row) => ({
    title: row.title,
    priceCents: row.sold_price_cents,
    date: row.sold_date.split("T")[0],
    imageUrl: row.image_url,
    ebayUrl: row.ebay_url,
  }));
}

async function fetchSoldListingsForCard(card: PriceChartingCard): Promise<SoldListing[]> {
  let query = supabase
    .from("sold_listings")
    .select("title, sold_price_cents, sold_date, image_url, ebay_url")
    .ilike("player_name", `%${card.player_name}%`)
    .order("sold_date", { ascending: false })
    .limit(30);

  if (card.year) query = query.eq("year", card.year);

  const { data } = await query.returns<SoldListingRow[]>();
  if (data && data.length > 0) return mapSoldListingRows(data);

  if (!card.set_name && !card.card_number) return [];

  let fallback = supabase
    .from("sold_listings")
    .select("title, sold_price_cents, sold_date, image_url, ebay_url")
    .order("sold_date", { ascending: false })
    .limit(40);

  if (card.year) fallback = fallback.eq("year", card.year);
  if (card.set_name) fallback = fallback.ilike("set_name", `%${card.set_name}%`);
  if (card.card_number) {
    const num = card.card_number.replace(/^#/, "").trim();
    fallback = fallback.ilike("title", `%#${num}%`);
  }

  const { data: fallbackData } = await fallback.returns<SoldListingRow[]>();
  return fallbackData?.length ? mapSoldListingRows(fallbackData) : [];
}

/**
 * Returns a PortfolioValuation for the given card using PriceCharting as the
 * pricing source. Returns null if the card can't be found or has no price
 * matching its grade tier — caller should fall back to the eBay path.
 */
export async function fetchPortfolioValuationFromPriceCharting(
  card: PriceChartingCard
): Promise<PortfolioValuation | null> {
  const product = await lookupProduct(card);
  if (!product) return null;

  const tier = resolveGradeTierPrice(product.prices, card.grade);
  const gradedRequest =
    !!card.grade?.trim() && !/raw|ungraded/i.test(card.grade);
  if (!tier.priceCents && !gradedRequest) return null;

  if (card.id && product.id && card.pricecharting_id !== product.id) {
    cachePriceChartingId(card.id, product.id).catch(() => {
      // best effort — a failed cache write shouldn't block the valuation
    });
  }

  const allSoldListings = await fetchSoldListingsForCard(card);
  const { gradeMatched } = filterSoldListingsByComp(allSoldListings, card);
  const cleanedGradeMatched = filterCompOutliers(gradeMatched);
  const soldListings = gradedRequest
    ? cleanedGradeMatched
    : cleanedGradeMatched.length > 0
      ? cleanedGradeMatched
      : filterCompOutliers(allSoldListings);
  const compCountGradeSpecific = cleanedGradeMatched.length;
  const catalogVolume = product.salesVolume;

  const catalogCents =
    tier.priceCents && tier.priceCents > 0 && !tier.usedRawFallback
      ? tier.priceCents
      : null;
  const compMin =
    gradedRequest && !catalogCents && cleanedGradeMatched.length > 0
      ? Math.min(RECENT_COMP_MIN, cleanedGradeMatched.length)
      : RECENT_COMP_MIN;

  const recentCompAvg =
    gradedRequest && card.grade && cleanedGradeMatched.length > 0
      ? computeRecentCompAverage(cleanedGradeMatched, card.grade, compMin)
      : gradedRequest && card.grade
        ? computeRecentCompAverage(cleanedGradeMatched, card.grade)
        : null;

  const currentValueCents = recentCompAvg?.priceCents ?? catalogCents;
  if (!currentValueCents || currentValueCents <= 0) return null;

  const priceFromComps = recentCompAvg != null;
  const gradeTierUsed =
    recentCompAvg && card.grade?.trim()
      ? card.grade.trim()
      : tier.gradeTierUsed;
  const matchLevel = priceFromComps
    ? recentCompAvg.compCount >= RECENT_COMP_MIN
      ? "exact"
      : "grade"
    : computePcMatchLevel(!!product.id, tier, compCountGradeSpecific);

  const recentSales = (recentCompAvg?.compsUsed ?? soldListings.slice(0, 15))
    .map((s) => ({ priceCents: s.priceCents, date: s.date }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const matchLabel = priceFromComps
    ? `${gradeTierUsed} · avg last ${recentCompAvg.compCount} sold`
    : buildMatchLabel(
        matchLevel,
        "pricecharting",
        gradeTierUsed,
        compCountGradeSpecific,
        catalogVolume
      );

  return {
    currentValueCents,
    trend7dPct: null,
    trend30dPct: null,
    numSales: compCountGradeSpecific > 0 ? compCountGradeSpecific : (catalogVolume ?? soldListings.length),
    recentSales,
    soldListings: recentCompAvg?.compsUsed ?? soldListings,
    activeListings: [],
    matchLevel,
    priceSource: priceFromComps ? "ebay_sold" : "pricecharting",
    gradeTierUsed,
    compCountGradeSpecific: priceFromComps ? recentCompAvg.compCount : compCountGradeSpecific,
    catalogVolume,
    matchLabel,
    usedRawFallback: tier.usedRawFallback,
  };
}

// ----------------------------------------------------------------------------
// Canonical card metadata lookup
//
// eBay titles are messy ("Michael Jordan Chicago Bulls 1986-87 Fleer #57 PSA
// Authenticated 5 Rookie Card") and our regex-based parser routinely gets
// `player_name`, `sport`, and `set_name` wrong. PriceCharting's catalog is
// authoritative — we can search with the raw title and pull back a canonical
// product whose `productName` and `consoleName` can be deterministically
// parsed into the fields we need.
// ----------------------------------------------------------------------------

export interface CanonicalCardMetadata {
  pricechartingId: string;
  playerName: string;
  setName: string;
  year: number | null;
  cardNumber: string | null;
  sport: Sport;
  /** Raw/ungraded price from PC, used as a baseline snapshot. */
  rawPriceCents: number | null;
  productName: string;
  consoleName: string;
}

const CONSOLE_SPORT_KEYWORDS: Record<Sport, RegExp> = {
  baseball: /\bbaseball\b/i,
  basketball: /\bbasketball\b/i,
  football: /\bfootball\b/i,
  hockey: /\bhockey\b/i,
  pokemon: /\bpok[eé]mon\b/i,
  formula1: /\b(formula\s*1|f1)\b/i,
};

function parseSportFromConsoleName(consoleName: string): Sport | null {
  for (const sport of SPORTS) {
    if (CONSOLE_SPORT_KEYWORDS[sport].test(consoleName)) return sport;
  }
  return null;
}

function parseYearFromConsoleName(consoleName: string): number | null {
  const match = consoleName.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract the set name from a PC `consoleName` like "Basketball Cards 1986 Fleer"
 * → "Fleer". Strips the sport prefix, the literal " Cards", and the year.
 */
function parseSetNameFromConsoleName(consoleName: string): string {
  return consoleName
    .replace(/\b(baseball|basketball|football|hockey|pok[eé]mon|formula\s*1|f1)\b/i, "")
    .replace(/\bcards\b/i, "")
    .replace(/\b(19[5-9]\d|20[0-3]\d)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract player name and card number from a PC `productName` like
 * "Michael Jordan #57" or "Michael Jordan [Rookie]".
 */
function parseProductName(productName: string): { playerName: string; cardNumber: string | null } {
  const cardNumberMatch = productName.match(/#([A-Za-z0-9-]+)/);
  const cardNumber = cardNumberMatch ? cardNumberMatch[1] : null;

  const playerName = productName
    .replace(/#\S+/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return { playerName, cardNumber };
}

function normalizeProductToCanonical(product: NormalizedProduct): CanonicalCardMetadata | null {
  const sport = parseSportFromConsoleName(product.consoleName);
  if (!sport) return null; // not a sports card (e.g. video game)

  const { playerName, cardNumber } = parseProductName(product.productName);
  if (!playerName) return null;

  return {
    pricechartingId: product.id,
    playerName,
    setName: parseSetNameFromConsoleName(product.consoleName),
    year: parseYearFromConsoleName(product.consoleName),
    cardNumber,
    sport,
    rawPriceCents: product.prices.rawCents,
    productName: product.productName,
    consoleName: product.consoleName,
  };
}

/**
 * Look up the canonical metadata for a card from PriceCharting. Used at
 * watchlist-add and portfolio-add time to save clean, structured data instead
 * of whatever eBay's parser spit out. Returns null if PC has no match or only
 * matches non-sports-card products.
 */
export async function lookupCanonicalCard(candidate: {
  player_name?: string | null;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  ebay_title?: string | null;
}): Promise<CanonicalCardMetadata | null> {
  const structuredQuery = [
    candidate.year?.toString(),
    cleanSetName(candidate.set_name),
    candidate.player_name,
    candidate.card_number ? `#${candidate.card_number}` : null,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  // Prefer the raw eBay title when we have it — PC's fuzzy search is robust
  // against noise words, and the title retains signal (Bulls/Lakers, rookie,
  // etc.) that our parser strips away.
  const q = candidate.ebay_title?.trim() || structuredQuery;
  if (!q) return null;

  const { data, error } = await supabase.functions.invoke<EdgeResponse>("pricecharting-lookup", {
    body: { action: "search", q },
  });

  if (error || !data || data.status !== "success") return null;
  const products = "products" in data ? data.products : [];

  for (const product of products) {
    const canonical = normalizeProductToCanonical(product);
    if (canonical) return canonical;
  }

  return null;
}
