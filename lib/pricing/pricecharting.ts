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

/**
 * Maps a card's grade string (free-form from scan/import flows) to the matching
 * PriceCharting price tier. Falls back through reasonable proxies before raw.
 */
function pickPriceForGrade(prices: NormalizedPrices, grade: string | null | undefined): number | null {
  if (!grade) return prices.rawCents;
  const g = grade.trim();
  if (g === "") return prices.rawCents;

  if (/psa\s*10/i.test(g)) return prices.psa10Cents ?? prices.rawCents;
  if (/psa\s*9(?!\.5)/i.test(g)) return prices.psa9Cents ?? prices.rawCents;
  if (/psa\s*8/i.test(g)) return prices.psa8Cents ?? prices.rawCents;
  if (/psa\s*7/i.test(g)) return prices.psa7Cents ?? prices.rawCents;
  if (/bgs\s*10/i.test(g)) return prices.bgs10Cents ?? prices.psa10Cents ?? prices.rawCents;
  if (/bgs\s*9\.?5/i.test(g)) return prices.bgs95Cents ?? prices.psa9Cents ?? prices.rawCents;
  if (/bgs\s*9(?!\.)/i.test(g)) return prices.psa9Cents ?? prices.rawCents;
  if (/sgc\s*10/i.test(g)) return prices.sgc10Cents ?? prices.psa10Cents ?? prices.rawCents;
  if (/cgc\s*10/i.test(g)) return prices.cgc10Cents ?? prices.psa10Cents ?? prices.rawCents;
  if (/raw|ungraded/i.test(g)) return prices.rawCents;

  return prices.rawCents;
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

async function fetchSoldListingsForCard(card: PriceChartingCard): Promise<SoldListing[]> {
  let query = supabase
    .from("sold_listings")
    .select("title, sold_price_cents, sold_date, image_url, ebay_url")
    .ilike("player_name", `%${card.player_name}%`)
    .order("sold_date", { ascending: false })
    .limit(30);

  if (card.year) query = query.eq("year", card.year);

  const { data } = await query.returns<SoldListingRow[]>();
  if (!data || data.length === 0) return [];

  return data.map((row) => ({
    title: row.title,
    priceCents: row.sold_price_cents,
    date: row.sold_date.split("T")[0],
    imageUrl: row.image_url,
    ebayUrl: row.ebay_url,
  }));
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

  const currentValueCents = pickPriceForGrade(product.prices, card.grade);
  if (!currentValueCents || currentValueCents <= 0) return null;

  if (card.id && product.id && card.pricecharting_id !== product.id) {
    cachePriceChartingId(card.id, product.id).catch(() => {
      // best effort — a failed cache write shouldn't block the valuation
    });
  }

  const soldListings = await fetchSoldListingsForCard(card);
  const recentSales = soldListings
    .slice(0, 15)
    .map((s) => ({ priceCents: s.priceCents, date: s.date }));

  return {
    currentValueCents,
    // PriceCharting doesn't expose period-over-period deltas. Leaving null for
    // now; when we start persisting daily PC snapshots we can compute these
    // from history.
    trend7dPct: null,
    trend30dPct: null,
    numSales: product.salesVolume ?? soldListings.length,
    recentSales,
    soldListings,
    // Populated separately via fetchActiveListingsForCard (eBay).
    activeListings: [],
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
