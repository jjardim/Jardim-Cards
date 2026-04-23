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
