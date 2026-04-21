import { supabase } from "./supabase";
import type { MarketMover, CardSearchResult } from "./types";
import {
  getTrendingCards as getMockTrending,
  searchCards as mockSearch,
  generateMockPriceHistory,
  getCardBySearchKey as getMockCard,
  getRelatedCards as getMockRelated,
  getBuyPrice as getMockBuyPrice,
  getTrendReason as getMockTrendReason,
} from "./mock-data";

const USE_MOCK = false;

interface EbaySearchItem {
  id: string;
  title: string;
  priceCents: number | null;
  imageUrl: string | null;
  itemWebUrl: string | null;
  condition: string | null;
}

interface EbaySearchResponse {
  items: EbaySearchItem[];
  total: number;
  offset: number;
  limit: number;
}

interface EbaySoldItem {
  ebayItemId: string;
  title: string;
  soldPriceCents: number;
  soldDate: string;
  imageUrl: string | null;
  ebayUrl: string;
}

interface EbaySoldResponse {
  soldItems: EbaySoldItem[];
  aggregate: {
    search_key: string;
    player_name: string;
    avg_price_cents: number;
    trend_7d_pct: number | null;
    trend_30d_pct: number | null;
    num_sales: number;
  } | null;
  searchKey: string;
  count: number;
}

interface TrendingResponse {
  trending: MarketMover[];
  count: number;
}

export async function fetchTrending(
  sport?: string,
  yearMin?: number,
  yearMax?: number
): Promise<MarketMover[]> {
  if (USE_MOCK) {
    return getMockTrending(sport, yearMin, yearMax);
  }

  try {
    const { data, error } = await supabase.functions.invoke<TrendingResponse>("trending", {
      body: { sport: sport || undefined, yearMin, yearMax, limit: 20, sortBy: "trend_7d" },
    });

    if (!error && data?.trending?.length) {
      return data.trending;
    }

    const dbResults = await fetchTrendingFromDB(sport, yearMin, yearMax);
    if (dbResults.length > 0) return dbResults;

    const mocks = getMockTrending(sport, yearMin, yearMax);

    if (sport && sport !== "baseball") {
      seedSportData(sport, mocks).catch(() => {});
    }

    return mocks;
  } catch {
    return getMockTrending(sport, yearMin, yearMax);
  }
}

async function fetchTrendingFromDB(
  sport?: string,
  yearMin?: number,
  yearMax?: number
): Promise<MarketMover[]> {
  try {
    let query = supabase
      .from("price_aggregates")
      .select("*")
      .order("num_sales", { ascending: false })
      .limit(20);

    if (sport) query = query.eq("sport", sport);
    if (yearMin) query = query.gte("year", yearMin);
    if (yearMax) query = query.lte("year", yearMax);

    const { data, error } = await query;
    if (error || !data?.length) return [];

    return data.map((row: Record<string, unknown>) => ({
      searchKey: row.search_key as string,
      playerName: row.player_name as string,
      setName: row.set_name as string | null,
      year: row.year as number | null,
      sport: row.sport as string,
      imageUrl: (row.image_url as string) ?? null,
      avgPriceCents: row.avg_price_cents as number,
      trend7dPct: (row.trend_7d_pct as number) ?? 0,
      trend30dPct: (row.trend_30d_pct as number) ?? null,
      numSales: row.num_sales as number,
    }));
  } catch {
    return [];
  }
}

const seededSports = new Set<string>();

async function seedSportData(sport: string, mocks: MarketMover[]) {
  if (seededSports.has(sport)) return;
  seededSports.add(sport);

  const topCards = mocks.slice(0, 4);
  for (const card of topCards) {
    const query = [card.year?.toString(), card.setName, card.playerName].filter(Boolean).join(" ");
    try {
      await supabase.functions.invoke("ebay-sold", {
        body: {
          query,
          playerName: card.playerName,
          setName: card.setName,
          year: card.year,
          sport,
        },
      });
    } catch {
      // best effort
    }
  }
}

export async function searchEbayCards(
  query: string,
  sport?: string,
  limit = 20,
  offset = 0
): Promise<CardSearchResult[]> {
  if (USE_MOCK) {
    return mockSearch(query);
  }

  try {
    const { data, error } = await supabase.functions.invoke<EbaySearchResponse>("ebay-search", {
      body: { query, sport, limit, offset },
    });

    if (error || !data?.items?.length) {
      return mockSearch(query);
    }

    return data.items.map((item) => ({
      id: item.id,
      title: item.title,
      playerName: extractPlayerName(item.title),
      setName: extractSetName(item.title),
      year: extractYear(item.title),
      cardNumber: null,
      sport: sport ?? "baseball",
      imageUrl: item.imageUrl,
      currentPriceCents: item.priceCents,
      trend7dPct: null,
      source: "ebay" as const,
    }));
  } catch {
    return mockSearch(query);
  }
}

export async function fetchSoldData(
  query: string,
  params?: {
    sport?: string;
    searchKey?: string;
    playerName?: string;
    setName?: string;
    year?: number;
  }
): Promise<EbaySoldResponse | null> {
  if (USE_MOCK) {
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke<EbaySoldResponse>("ebay-sold", {
      body: { query, ...params },
    });

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getCardDetail(searchKey: string) {
  const mockCard = getMockCard(searchKey);
  if (!mockCard) return null;

  if (USE_MOCK) {
    return {
      card: mockCard,
      priceHistory: generateMockPriceHistory(mockCard.avgPriceCents, 90),
      relatedCards: getMockRelated(mockCard),
      buySignal: getMockBuyPrice(mockCard),
      trendReason: getMockTrendReason(mockCard),
    };
  }

  const { data: aggData } = await supabase
    .from("price_aggregates")
    .select("*")
    .eq("search_key", searchKey)
    .single();

  const card: MarketMover = aggData
    ? {
        searchKey: aggData.search_key,
        playerName: aggData.player_name,
        setName: aggData.set_name,
        year: aggData.year,
        sport: aggData.sport,
        imageUrl: aggData.image_url ?? null,
        avgPriceCents: aggData.avg_price_cents,
        trend7dPct: aggData.trend_7d_pct ?? 0,
        trend30dPct: aggData.trend_30d_pct ?? null,
        numSales: aggData.num_sales,
      }
    : mockCard;

  const { data: soldData } = await supabase
    .from("sold_listings")
    .select("id, title, sold_price_cents, sold_date, image_url, ebay_url")
    .eq("player_name", card.playerName)
    .order("sold_date", { ascending: false })
    .limit(200);

  const priceHistory = soldData?.length
    ? soldData
        .slice()
        .sort((a: { sold_date: string }, b: { sold_date: string }) => a.sold_date.localeCompare(b.sold_date))
        .map((row: { sold_price_cents: number; sold_date: string }) => ({
          date: row.sold_date.split("T")[0],
          priceCents: row.sold_price_cents,
        }))
    : generateMockPriceHistory(card.avgPriceCents, 90);

  const soldListings: SoldListing[] = soldData?.length
    ? soldData.map((row: { title: string; sold_price_cents: number; sold_date: string; image_url: string | null; ebay_url: string }) => ({
        title: row.title,
        priceCents: row.sold_price_cents,
        date: row.sold_date.split("T")[0],
        imageUrl: row.image_url,
        ebayUrl: row.ebay_url,
      }))
    : [];

  const { data: relatedAggs } = await supabase
    .from("price_aggregates")
    .select("*")
    .eq("sport", card.sport)
    .neq("search_key", searchKey)
    .order("trend_7d_pct", { ascending: false, nullsFirst: false })
    .limit(4);

  const relatedCards: MarketMover[] = relatedAggs?.length
    ? relatedAggs.map((row: Record<string, unknown>) => ({
        searchKey: row.search_key as string,
        playerName: row.player_name as string,
        setName: row.set_name as string | null,
        year: row.year as number | null,
        sport: row.sport as string,
        imageUrl: (row.image_url as string) ?? null,
        avgPriceCents: row.avg_price_cents as number,
        trend7dPct: (row.trend_7d_pct as number) ?? 0,
        trend30dPct: (row.trend_30d_pct as number) ?? null,
        numSales: row.num_sales as number,
      }))
    : getMockRelated(card);

  return {
    card,
    priceHistory,
    relatedCards,
    soldListings,
    buySignal: getMockBuyPrice(card),
    trendReason: getMockTrendReason(card),
  };
}

const imageCache = new Map<string, string | null>();

export async function fetchCardImage(
  playerName: string,
  setName?: string | null,
  year?: number | null
): Promise<string | null> {
  const cacheKey = `${playerName}-${setName ?? ""}-${year ?? ""}`;
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey) ?? null;

  try {
    const query = [year, setName, playerName].filter(Boolean).join(" ");
    const { data, error } = await supabase.functions.invoke<EbaySearchResponse>("ebay-search", {
      body: { query, limit: 1 },
    });

    const url = (!error && data?.items?.[0]?.imageUrl) ? data.items[0].imageUrl : null;
    imageCache.set(cacheKey, url);
    return url;
  } catch {
    imageCache.set(cacheKey, null);
    return null;
  }
}

export interface SoldListing {
  title: string;
  priceCents: number;
  date: string;
  imageUrl: string | null;
  ebayUrl: string;
}

export interface ActiveListing {
  title: string;
  priceCents: number;
  imageUrl: string | null;
  ebayUrl: string;
}

export interface PortfolioValuation {
  currentValueCents: number;
  trend7dPct: number | null;
  trend30dPct: number | null;
  numSales: number;
  recentSales: { priceCents: number; date: string }[];
  soldListings: SoldListing[];
  activeListings: ActiveListing[];
}

function filterByTitleTerm<T extends { title: string }>(
  items: T[],
  term: string | null | undefined,
  strict = false
): T[] {
  if (!term) return items;

  const termLower = term.toLowerCase();
  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(termLower)
  );
  return strict || filtered.length > 0 ? filtered : items;
}

export async function fetchActiveListingsForCard(card: {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  grade?: string | null;
}): Promise<ActiveListing[]> {
  const query = [card.year, card.set_name, card.player_name, card.card_number ? `#${card.card_number}` : null, card.grade]
    .filter(Boolean)
    .join(" ");

  try {
    const { data, error } = await supabase.functions.invoke<EbaySearchResponse>("ebay-search", {
      body: { query, limit: 40 },
    });

    if (error || !data?.items?.length) return [];

    let mapped: ActiveListing[] = data.items.map((item) => ({
      title: item.title,
      priceCents: item.priceCents ?? 0,
      imageUrl: item.imageUrl,
      ebayUrl: item.itemWebUrl ?? "",
    }));

    mapped = filterByTitleTerm(mapped, card.set_name, false);
    mapped = filterByTitleTerm(mapped, card.grade, true);

    return mapped;
  } catch {
    return [];
  }
}

const valuationCache = new Map<string, { data: PortfolioValuation; ts: number }>();
const VALUATION_TTL = 1000 * 60 * 30; // 30 min

export async function fetchPortfolioValuation(card: {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  grade?: string | null;
  image_url?: string | null;
}): Promise<PortfolioValuation | null> {
  const parts = [
    card.year?.toString(),
    card.set_name,
    card.player_name,
    card.card_number ? `#${card.card_number}` : null,
    card.grade,
  ].filter(Boolean);
  const query = parts.join(" ");

  const cached = valuationCache.get(query);
  if (cached && Date.now() - cached.ts < VALUATION_TTL) return cached.data;

  if (USE_MOCK) {
    const baseCents = 3000 + Math.floor(Math.random() * 8000);
    const mockSales = Array.from({ length: 10 }, (_, i) => {
      const price = baseCents + Math.floor((Math.random() - 0.4) * 2000);
      const date = new Date(Date.now() - (10 - i) * 86400000).toISOString().split("T")[0];
      return { priceCents: price, date };
    });
    const mockListings: SoldListing[] = mockSales.map((s, i) => ({
      title: `${query} - Listing ${i + 1}`,
      priceCents: s.priceCents,
      date: s.date,
      imageUrl: card.image_url ?? null,
      ebayUrl: `https://www.ebay.com/itm/mock-${i + 1}`,
    }));
    const mockVal: PortfolioValuation = {
      currentValueCents: baseCents,
      trend7dPct: Math.round((Math.random() * 30 - 10) * 10) / 10,
      trend30dPct: Math.round((Math.random() * 40 - 15) * 10) / 10,
      numSales: mockSales.length,
      recentSales: mockSales,
      soldListings: mockListings,
      activeListings: [],
    };
    valuationCache.set(query, { data: mockVal, ts: Date.now() });
    return mockVal;
  }

  try {
    // Try Supabase cached data first (sold_listings + price_aggregates)
    const dbResult = await fetchValuationFromDB(card);
    if (dbResult) {
      valuationCache.set(query, { data: dbResult, ts: Date.now() });
      // Fire off a background refresh via edge function (don't await)
      refreshValuationFromAPI(query, card).catch(() => {});
      return dbResult;
    }

    // No cached data -- call edge function
    return await refreshValuationFromAPI(query, card);
  } catch {
    return null;
  }
}

async function fetchValuationFromDB(card: {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  grade?: string | null;
}): Promise<PortfolioValuation | null> {
  try {
    let listingsQuery = supabase
      .from("sold_listings")
      .select("*")
      .ilike("player_name", `%${card.player_name}%`)
      .order("sold_date", { ascending: true })
      .limit(50);

    if (card.year) listingsQuery = listingsQuery.eq("year", card.year);
    if (card.set_name) listingsQuery = listingsQuery.ilike("set_name", `%${card.set_name}%`);

    const { data: listings } = await listingsQuery;
    if (!listings || listings.length === 0) return null;

    const setLower = card.set_name?.toLowerCase();
    const gradeLower = card.grade?.toLowerCase();
    let filtered = listings;

    if (setLower) {
      const bySet = filtered.filter((r: Record<string, unknown>) =>
        (r.title as string).toLowerCase().includes(setLower)
      );
      if (bySet.length > 0) filtered = bySet;
    }

    if (gradeLower) {
      const byGrade = filtered.filter((r: Record<string, unknown>) =>
        (r.title as string).toLowerCase().includes(gradeLower)
      );
      if (byGrade.length > 0) filtered = byGrade;
    }

    if (filtered.length === 0) return null;

    const soldListings: SoldListing[] = filtered.map((row: Record<string, unknown>) => ({
      title: row.title as string,
      priceCents: row.sold_price_cents as number,
      date: (row.sold_date as string).split("T")[0],
      imageUrl: (row.image_url as string) ?? null,
      ebayUrl: (row.ebay_url as string) ?? "",
    }));

    const recentSales = soldListings
      .map((s) => ({ priceCents: s.priceCents, date: s.date }))
      .slice(-15);

    const prices = soldListings.map((s) => s.priceCents);
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);

    const searchKey = [card.year, card.set_name, card.player_name]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))
      .join("-");

    const { data: agg } = await supabase
      .from("price_aggregates")
      .select("trend_7d_pct, trend_30d_pct, num_sales, avg_price_cents")
      .eq("search_key", searchKey)
      .maybeSingle();

    return {
      currentValueCents: agg?.avg_price_cents ?? avg,
      trend7dPct: agg?.trend_7d_pct ?? null,
      trend30dPct: agg?.trend_30d_pct ?? null,
      numSales: agg?.num_sales ?? soldListings.length,
      recentSales,
      soldListings,
      activeListings: [],
    };
  } catch {
    return null;
  }
}

async function refreshValuationFromAPI(
  query: string,
  card: { player_name: string; set_name?: string | null; year?: number | null; card_number?: string | null; grade?: string | null }
): Promise<PortfolioValuation | null> {
  const { data, error } = await supabase.functions.invoke<EbaySoldResponse>("ebay-sold", {
    body: {
      query,
      playerName: card.player_name,
      setName: card.set_name,
      year: card.year,
      cardNumber: card.card_number,
      grade: card.grade,
    },
  });

  if (error || !data) return null;

  const sorted = (data.soldItems ?? [])
    .sort((a, b) => a.soldDate.localeCompare(b.soldDate));

  const recentSales = sorted
    .map((s) => ({ priceCents: s.soldPriceCents, date: s.soldDate.split("T")[0] }))
    .slice(-15);

  const soldListings: SoldListing[] = sorted.map((s) => ({
    title: s.title,
    priceCents: s.soldPriceCents,
    date: s.soldDate.split("T")[0],
    imageUrl: s.imageUrl,
    ebayUrl: s.ebayUrl,
  }));

  const result: PortfolioValuation = {
    currentValueCents: data.aggregate?.avg_price_cents ?? 0,
    trend7dPct: data.aggregate?.trend_7d_pct ?? null,
    trend30dPct: data.aggregate?.trend_30d_pct ?? null,
    numSales: data.aggregate?.num_sales ?? 0,
    recentSales,
    soldListings,
    activeListings: [],
  };

  valuationCache.set(query, { data: result, ts: Date.now() });
  return result;
}

function extractPlayerName(title: string): string {
  const cleaned = title
    .replace(/\d{4}\s*/g, "")
    .replace(/#\S+/g, "")
    .replace(/\b(topps|bowman|chrome|update|panini|sp|upper deck|donruss|fleer|score)\b/gi, "")
    .replace(/\b(rc|rookie|psa|bgs|sgc|graded|\d+)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || title.slice(0, 30);
}

export interface RecentSale {
  id: string;
  title: string;
  playerName: string | null;
  setName: string | null;
  year: number | null;
  sport: string;
  soldPriceCents: number;
  soldDate: string;
  imageUrl: string | null;
  ebayUrl: string;
}

export async function fetchRecentSales(
  sport?: string,
  yearMin?: number,
  yearMax?: number,
  minPriceCents = 5000,
  limit = 10
): Promise<RecentSale[]> {
  let query = supabase
    .from("sold_listings")
    .select("*")
    .gte("sold_price_cents", minPriceCents)
    .order("sold_date", { ascending: false })
    .limit(limit);

  if (sport) query = query.eq("sport", sport);
  if (yearMin) query = query.gte("year", yearMin);
  if (yearMax) query = query.lte("year", yearMax);

  const { data, error } = await query;

  if (error || !data?.length) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    playerName: row.player_name as string | null,
    setName: row.set_name as string | null,
    year: row.year as number | null,
    sport: row.sport as string,
    soldPriceCents: row.sold_price_cents as number,
    soldDate: row.sold_date as string,
    imageUrl: row.image_url as string | null,
    ebayUrl: row.ebay_url as string,
  }));
}

function extractSetName(title: string): string | null {
  const match = title.match(
    /\b(\d{4})\s+(topps|bowman|panini|upper deck|donruss|fleer|score|sp)\s*(chrome|update|heritage|prizm|select|mosaic|optic)?/i
  );
  return match ? match[0].trim() : null;
}

function extractYear(title: string): number | null {
  const match = title.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  return match ? parseInt(match[1]) : null;
}
