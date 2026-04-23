import { supabase } from "./supabase";
import type { MarketMover, CardSearchResult, WatchlistCard } from "./types";
import {
  getTrendingCards as getMockTrending,
  searchCards as mockSearch,
  generateMockPriceHistory,
  getCardBySearchKey as getMockCard,
  getRelatedCards as getMockRelated,
  getBuyPrice as getMockBuyPrice,
  getTrendReason as getMockTrendReason,
} from "./mock-data";
import { fetchPortfolioValuationFromPriceCharting } from "./pricing/pricecharting";

const USE_MOCK = false;

/**
 * When true, portfolio valuations are sourced from SportsCardsPro/PriceCharting
 * instead of eBay sold comps. On null / zero result we fall back to the eBay
 * path, so flipping this flag is safe. A/B by flipping per-environment.
 */
const USE_PRICECHARTING = true;

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

export async function getCardDetail(
  searchKey: string,
  hints?: {
    playerName: string;
    setName?: string | null;
    year?: number | null;
    grade?: string | null;
    sport?: string;
  }
) {
  if (USE_MOCK) {
    const mockCard = getMockCard(searchKey);
    if (!mockCard) return null;
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
    .maybeSingle();

  const mockCard = getMockCard(searchKey);

  if (!aggData && !mockCard) {
    const playerName = hints?.playerName ?? null;

    if (!playerName) return null;

    let listingsQuery = supabase
      .from("sold_listings")
      .select("id, title, sold_price_cents, sold_date, image_url, ebay_url, player_name, set_name, year, sport")
      .ilike("player_name", `%${playerName}%`)
      .order("sold_date", { ascending: false })
      .limit(100);

    if (hints?.year) listingsQuery = listingsQuery.eq("year", hints.year);

    const { data: soldRows } = await listingsQuery;

    if (!soldRows || soldRows.length === 0) {
      const { data: broadRows } = await supabase
        .from("sold_listings")
        .select("id, title, sold_price_cents, sold_date, image_url, ebay_url, player_name, set_name, year, sport")
        .ilike("player_name", `%${playerName}%`)
        .order("sold_date", { ascending: false })
        .limit(100);

      if (!broadRows || broadRows.length === 0) {
        const query = [hints?.year, hints?.setName, playerName].filter(Boolean).join(" ");
        await supabase.functions.invoke("ebay-sold", {
          body: { query, playerName, setName: hints?.setName, year: hints?.year, sport: hints?.sport },
        });

        return {
          card: {
            searchKey,
            playerName,
            setName: hints?.setName ?? null,
            year: hints?.year ?? null,
            sport: hints?.sport ?? "baseball",
            imageUrl: null,
            avgPriceCents: 0,
            trend7dPct: 0,
            trend30dPct: null,
            numSales: 0,
          } as MarketMover,
          priceHistory: [],
          relatedCards: [],
          soldListings: [],
          buySignal: null,
          trendReason: "Fetching market data... refresh in a moment.",
        };
      }

      return buildDetailFromSoldRows(searchKey, broadRows, hints);
    }

    return buildDetailFromSoldRows(searchKey, soldRows, hints);
  }

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
    : mockCard!;

  const { data: soldData } = await supabase
    .from("sold_listings")
    .select("id, title, sold_price_cents, sold_date, image_url, ebay_url")
    .ilike("player_name", `%${card.playerName}%`)
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

async function buildDetailFromSoldRows(
  searchKey: string,
  soldRows: Record<string, unknown>[],
  hints?: { playerName: string; setName?: string | null; year?: number | null; grade?: string | null; sport?: string }
) {
  const first = soldRows[0];
  const prices = soldRows.map((r) => r.sold_price_cents as number);
  const avg = computeRobustPrice(prices);

  const card: MarketMover = {
    searchKey,
    playerName: hints?.playerName ?? (first.player_name as string) ?? "Unknown",
    setName: hints?.setName ?? (first.set_name as string) ?? null,
    year: hints?.year ?? (first.year as number) ?? null,
    sport: hints?.sport ?? (first.sport as string) ?? "baseball",
    imageUrl: (first.image_url as string) ?? null,
    avgPriceCents: avg,
    trend7dPct: 0,
    trend30dPct: null,
    numSales: soldRows.length,
  };

  const sorted = soldRows
    .slice()
    .sort((a, b) => (a.sold_date as string).localeCompare(b.sold_date as string));

  const priceHistory = sorted.map((row) => ({
    date: (row.sold_date as string).split("T")[0],
    priceCents: row.sold_price_cents as number,
  }));

  const soldListings: SoldListing[] = soldRows.map((row) => ({
    title: row.title as string,
    priceCents: row.sold_price_cents as number,
    date: (row.sold_date as string).split("T")[0],
    imageUrl: (row.image_url as string) ?? null,
    ebayUrl: (row.ebay_url as string) ?? "",
  }));

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
    : [];

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

function cleanSetName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw
    .replace(/\b(19[5-9]\d|20[0-2]\d)\b/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim() || null;
}

function buildValuationQuery(card: {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  grade?: string | null;
}): string {
  return [
    card.year?.toString(),
    cleanSetName(card.set_name),
    card.player_name,
    card.card_number ? `#${card.card_number}` : null,
    card.grade,
  ].filter(Boolean).join(" ");
}

export async function fetchPortfolioValuation(card: {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  grade?: string | null;
  image_url?: string | null;
  ebay_title?: string | null;
  id?: string;
  pricecharting_id?: string | null;
}): Promise<PortfolioValuation | null> {
  const query = buildValuationQuery(card);

  const cached = valuationCache.get(query);
  if (cached && Date.now() - cached.ts < VALUATION_TTL) return cached.data;

  if (USE_PRICECHARTING) {
    const pcResult = await fetchPortfolioValuationFromPriceCharting({
      player_name: card.player_name,
      set_name: card.set_name,
      year: card.year,
      card_number: card.card_number,
      grade: card.grade,
      id: card.id,
      pricecharting_id: card.pricecharting_id,
    });
    if (pcResult && pcResult.currentValueCents > 0) {
      valuationCache.set(query, { data: pcResult, ts: Date.now() });
      return pcResult;
    }
    // fall through to eBay path on null / zero
  }

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
    if (dbResult && dbResult.currentValueCents > 0) {
      valuationCache.set(query, { data: dbResult, ts: Date.now() });
      refreshValuationFromAPI(query, card).catch(() => {});
      return dbResult;
    }

    // No cached data -- call edge function with full query
    const apiResult = await refreshValuationFromAPI(query, card);
    if (apiResult && apiResult.currentValueCents > 0) {
      return apiResult;
    }

    // Value came back $0 -- try progressively broader searches
    const broaderVariants = buildBroaderSearchVariants(card);
    for (const variant of broaderVariants) {
      const variantQuery = buildValuationQuery(variant);

      if (variantQuery === query) continue;

      const variantCached = valuationCache.get(variantQuery);
      if (variantCached && Date.now() - variantCached.ts < VALUATION_TTL && variantCached.data.currentValueCents > 0) {
        valuationCache.set(query, { data: variantCached.data, ts: Date.now() });
        return variantCached.data;
      }

      const variantResult = await refreshValuationFromAPI(variantQuery, variant);
      if (variantResult && variantResult.currentValueCents > 0) {
        valuationCache.set(query, { data: variantResult, ts: Date.now() });
        return variantResult;
      }
    }

    // Last resort: use the original eBay listing title as search query
    if (card.ebay_title) {
      const ebayTitleResult = await refreshValuationFromAPI(card.ebay_title, {
        player_name: card.ebay_title,
      });
      if (ebayTitleResult && ebayTitleResult.currentValueCents > 0) {
        valuationCache.set(query, { data: ebayTitleResult, ts: Date.now() });
        return ebayTitleResult;
      }
    }

    return apiResult;
  } catch {
    return null;
  }
}

const JUNK_PHRASES = [
  "free shipping", "fast shipping", "ships free", "free ship",
  "fast free", "combined shipping",
  "must see", "must have", "don't miss", "dont miss",
  "low pop", "low population", "pop report",
  "recently graded", "freshly graded", "just graded",
  "newly graded", "new slab", "new label",
  "read description", "see photos", "see pics",
  "no reserve", "gem mint", "near mint",
];

const JUNK_WORDS = new Set([
  "card", "cards", "lot", "vintage", "rare", "graded",
  "authentic", "certified", "official", "genuine",
  "mint", "gem", "near", "nm", "nm-mt", "ex", "vg",
  "good", "fair", "poor",
  "rookie", "rc", "refractor", "parallel", "insert", "base",
  "ssp", "variation", "variant",
  "baseball", "football", "basketball", "hockey",
  "nba", "nfl", "mlb", "nhl", "ncaa",
  "psa", "bgs", "sgc", "cgc",
  "topps", "bowman", "panini", "donruss", "fleer", "score",
  "prizm", "chrome", "update", "heritage", "select", "mosaic", "optic",
  "upper", "deck", "leaf", "stadium", "club", "finest", "ultra",
  "skybox", "hoops", "traded", "tiffany", "flagship",
  "o-pee-chee", "nr",
  "hot", "fire", "invest", "investment", "wow", "nice",
  "great", "awesome", "beauty", "look",
  "qty", "quantity", "shipping", "free", "fast", "ship",
]);

function cleanPlayerName(raw: string): string {
  let cleaned = raw;

  cleaned = cleaned.replace(/\b(PSA|BGS|SGC|CGC)\s*(?:graded|gem\s*mint|mint|near\s*mint|nm-mt|nm)?\s*\d+\.?\d*/gi, "");
  cleaned = cleaned.replace(/\bgraded\s*\d+\.?\d*/gi, "");
  cleaned = cleaned.replace(/\b(19[5-9]\d|20[0-2]\d)\b/g, "");
  cleaned = cleaned.replace(/\([^)]*\)/g, "");
  cleaned = cleaned.replace(/#\s*\w*\d+\w*/gi, "");
  cleaned = cleaned.replace(/\b(?:no\.?|number)\s*\d+\w*\b/gi, "");

  for (const phrase of JUNK_PHRASES) {
    cleaned = cleaned.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
  }

  cleaned = cleaned
    .split(/\s+/)
    .filter((word) => {
      const lower = word.toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (!lower) return false;
      if (JUNK_WORDS.has(lower)) return false;
      if (/^\d+$/.test(lower)) return false;
      if (/^\d+\/\d+$/.test(lower)) return false;
      return true;
    })
    .join(" ");

  cleaned = cleaned
    .replace(/[#*()[\]{}|~^`]/g, "")
    .replace(/^[\s\-\u2013\u2014,.:;/\\]+/, "")
    .replace(/[\s\-\u2013\u2014,.:;/\\]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || raw;
}

function buildBroaderSearchVariants(card: {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  grade?: string | null;
}): Array<typeof card> {
  const variants: Array<typeof card> = [];
  const cleanedName = cleanPlayerName(card.player_name);
  const nameWasDirty = cleanedName !== card.player_name;
  const name = nameWasDirty ? cleanedName : card.player_name;
  const set = cleanSetName(card.set_name);

  // 1. Cleaned name + set + year + card# + grade (fix dirty name/set, keep all details)
  if (nameWasDirty || set !== card.set_name) {
    variants.push({
      player_name: name,
      year: card.year,
      set_name: set,
      card_number: card.card_number,
      grade: card.grade,
    });
  }

  // 2. Same but drop grade
  variants.push({
    player_name: name,
    year: card.year,
    set_name: set,
    card_number: card.card_number,
    grade: null,
  });

  // 3. Drop card number, keep grade
  if (card.card_number) {
    variants.push({
      player_name: name,
      year: card.year,
      set_name: set,
      card_number: null,
      grade: card.grade,
    });
  }

  // 4. Set + name + year (no grade, no card#)
  variants.push({
    player_name: name,
    year: card.year,
    set_name: set,
    card_number: null,
    grade: null,
  });

  // 5. Name + year only
  if (set) {
    variants.push({
      player_name: name,
      year: card.year,
      set_name: null,
      card_number: null,
      grade: null,
    });
  }

  // 6. Just name (broadest)
  if (card.year) {
    variants.push({
      player_name: name,
      year: null,
      set_name: null,
      card_number: null,
      grade: null,
    });
  }

  return variants;
}

function computeRobustPrice(prices: number[]): number {
  if (prices.length === 0) return 0;
  if (prices.length === 1) return prices[0];

  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
    : sorted[Math.floor(sorted.length / 2)];

  if (sorted.length < 4) return median;

  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const inliers = sorted.filter((p) => p >= lowerBound && p <= upperBound);
  if (inliers.length === 0) return median;

  const inlierMedian = inliers.length % 2 === 0
    ? Math.round((inliers[inliers.length / 2 - 1] + inliers[inliers.length / 2]) / 2)
    : inliers[Math.floor(inliers.length / 2)];

  return inlierMedian;
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
    const robustValue = computeRobustPrice(prices);

    const searchKey = [card.year, card.set_name, card.player_name]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))
      .join("-");

    const { data: agg } = await supabase
      .from("price_aggregates")
      .select("trend_7d_pct, trend_30d_pct, num_sales, avg_price_cents")
      .eq("search_key", searchKey)
      .maybeSingle();

    const aggValue = agg?.avg_price_cents ?? 0;
    const finalValue = aggValue > 0
      ? sanityCheckValue(aggValue, robustValue)
      : robustValue;

    return {
      currentValueCents: finalValue,
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

function sanityCheckValue(aggValue: number, robustValue: number): number {
  if (robustValue === 0) return aggValue;
  const ratio = aggValue / robustValue;
  if (ratio > 3 || ratio < 0.33) return robustValue;
  return Math.round((aggValue + robustValue) / 2);
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

  const prices = soldListings.map((s) => s.priceCents);
  const robustValue = computeRobustPrice(prices);
  const aggValue = data.aggregate?.avg_price_cents ?? 0;
  const finalValue = aggValue > 0 && robustValue > 0
    ? sanityCheckValue(aggValue, robustValue)
    : robustValue || aggValue;

  const result: PortfolioValuation = {
    currentValueCents: finalValue,
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
    /\b(topps|bowman|panini|upper deck|donruss|fleer|score|sp|prizm|leaf|stadium club|finest|ultra|skybox|hoops|o-pee-chee)\s*(chrome|update|heritage|prizm|select|mosaic|optic|traded|tiffany|flagship)?/i
  );
  if (!match) return null;
  const brand = match[1];
  const variant = match[2] ?? "";
  return (brand + (variant ? " " + variant : "")).trim();
}

function extractYear(title: string): number | null {
  const match = title.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  return match ? parseInt(match[1]) : null;
}

export interface EbayItemLookupResult {
  itemId: string;
  title: string;
  playerName: string;
  setName: string | null;
  year: number | null;
  grade: string | null;
  cardNumber: string | null;
  sport: string;
  priceCents: number;
  imageUrl: string | null;
  allImageUrls: string[];
  ebayUrl: string;
  condition: string | null;
}

function extractEbayItemId(url: string): string | null {
  const itmMatch = url.match(/\/itm\/(?:[\w-]+\/)?([\d]{9,15})/i);
  if (itmMatch) return itmMatch[1];

  const plainMatch = url.match(/(?:^|\D)(\d{9,15})(?:$|\D)/);
  if (plainMatch) return plainMatch[1];

  return null;
}

function isOrderUrl(url: string): boolean {
  return /order\.ebay\.com/i.test(url);
}

export async function lookupEbayItem(url: string): Promise<EbayItemLookupResult> {
  const trimmed = url.trim();

  if (isOrderUrl(trimmed) && !extractEbayItemId(trimmed)) {
    throw new Error(
      "This looks like an eBay order URL. Please paste the item URL instead " +
        "(you can find it on the order details page)."
    );
  }

  const { data, error } = await supabase.functions.invoke<EbayItemLookupResult>(
    "ebay-item-lookup",
    { body: { url: trimmed } }
  );

  if (error) {
    const msg =
      typeof error === "object" && "message" in error
        ? (error as { message: string }).message
        : "Failed to look up eBay item";
    throw new Error(msg);
  }

  if (!data) {
    throw new Error("No data returned from eBay lookup");
  }

  return data;
}

// -----------------------------------------------------------------------------
// Watchlist
// -----------------------------------------------------------------------------

export interface AddWatchlistCardInput {
  player_name: string;
  set_name?: string | null;
  year?: number | null;
  card_number?: string | null;
  grade?: string | null;
  sport?: string;
  image_url?: string | null;
  ebay_title?: string | null;
  ebay_item_id?: string | null;
  ebay_url?: string | null;
  target_price_cents?: number | null;
  notes?: string | null;
  snapshot_price_cents?: number | null;
}

function buildSearchKey(
  playerName: string,
  setName?: string | null,
  year?: number | null
): string {
  return [year, setName, playerName]
    .filter(Boolean)
    .map((s) =>
      String(s)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    )
    .join("-");
}

export async function fetchWatchlist(): Promise<WatchlistCard[]> {
  const { data, error } = await supabase
    .from("watchlist_cards")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as WatchlistCard[];
}

export async function addToWatchlist(input: AddWatchlistCardInput): Promise<WatchlistCard> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in");

  const searchKey = buildSearchKey(input.player_name, input.set_name, input.year);
  const now = new Date().toISOString();

  const payload = {
    user_id: userId,
    search_key: searchKey || null,
    sport: input.sport ?? "baseball",
    year: input.year ?? null,
    player_name: input.player_name,
    set_name: input.set_name ?? null,
    card_number: input.card_number ?? null,
    grade: input.grade ?? null,
    image_url: input.image_url ?? null,
    ebay_title: input.ebay_title ?? null,
    ebay_item_id: input.ebay_item_id ?? null,
    ebay_url: input.ebay_url ?? null,
    target_price_cents: input.target_price_cents ?? null,
    notes: input.notes ?? null,
    snapshot_price_cents: input.snapshot_price_cents ?? null,
    snapshot_taken_at: input.snapshot_price_cents != null ? now : null,
  };

  const { data, error } = await supabase
    .from("watchlist_cards")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as WatchlistCard;
}

export async function removeFromWatchlist(id: string): Promise<void> {
  const { error } = await supabase.from("watchlist_cards").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateWatchlistSnapshot(
  id: string,
  snapshotPriceCents: number
): Promise<void> {
  const { error } = await supabase
    .from("watchlist_cards")
    .update({
      snapshot_price_cents: snapshotPriceCents,
      snapshot_taken_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export interface UpdateWatchlistCardInput {
  target_price_cents?: number | null;
  notes?: string | null;
}

export async function updateWatchlistCard(
  id: string,
  patch: UpdateWatchlistCardInput
): Promise<WatchlistCard> {
  const { data, error } = await supabase
    .from("watchlist_cards")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WatchlistCard;
}

export interface MoveToPortfolioInput {
  purchasePriceCents: number;
  purchaseDate: string; // yyyy-mm-dd
  quantity?: number;
}

/**
 * Moves a watchlist entry into the portfolio: inserts a portfolio_cards row
 * built from the watchlist card + user-supplied purchase details, then
 * deletes the watchlist row. If the portfolio insert fails we leave the
 * watchlist row intact so nothing is lost.
 */
export async function moveWatchlistToPortfolio(
  card: WatchlistCard,
  purchase: MoveToPortfolioInput
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in");

  const cardName = [card.year, card.set_name, card.player_name, card.card_number ? `#${card.card_number}` : ""]
    .filter(Boolean)
    .join(" ");

  const { error: insertError } = await supabase.from("portfolio_cards").insert({
    user_id: userId,
    card_name: cardName,
    player_name: card.player_name,
    set_name: card.set_name,
    year: card.year,
    card_number: card.card_number,
    sport: card.sport,
    grade: card.grade,
    image_url: card.image_url,
    ebay_title: card.ebay_title,
    ebay_item_id: card.ebay_item_id,
    ebay_url: card.ebay_url,
    purchase_price_cents: purchase.purchasePriceCents,
    purchase_date: purchase.purchaseDate,
    quantity: purchase.quantity ?? 1,
  });

  if (insertError) throw new Error(insertError.message);

  const { error: deleteError } = await supabase
    .from("watchlist_cards")
    .delete()
    .eq("id", card.id);

  if (deleteError) {
    // Portfolio insert succeeded; surface the delete failure but don't roll back.
    throw new Error(
      `Added to portfolio, but failed to remove from watchlist: ${deleteError.message}`
    );
  }
}

export interface WatchlistValuation {
  currentValueCents: number;
  numSales: number;
  recentSales: { priceCents: number; date: string }[];
}

/**
 * Lightweight valuation for a watchlist entry. Reuses the portfolio valuation
 * pipeline but returns only the fields we need for the row.
 */
export async function fetchWatchlistValuation(
  card: WatchlistCard
): Promise<WatchlistValuation | null> {
  const valuation = await fetchPortfolioValuation({
    player_name: card.player_name,
    set_name: card.set_name,
    year: card.year,
    card_number: card.card_number,
    grade: card.grade,
    image_url: card.image_url,
    ebay_title: card.ebay_title,
  });

  if (!valuation) return null;

  return {
    currentValueCents: valuation.currentValueCents,
    numSales: valuation.numSales,
    recentSales: valuation.recentSales,
  };
}
