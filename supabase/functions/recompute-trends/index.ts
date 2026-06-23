/**
 * recompute-trends
 *
 * Daily snapshot + trend recomputation job for `price_aggregates`.
 *
 * Trend priority:
 *   1. Daily price_snapshots (7d / 30d lookback)
 *   2. sold_listings comp windows (recent 7d vs prior 7–30d, then 7–90d)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AggregateRow {
  id: string;
  search_key: string;
  player_name: string;
  set_name: string | null;
  year: number | null;
  sport: string;
  grade: string;
  avg_price_cents: number;
  num_sales: number;
  pricecharting_id: string | null;
}

interface PCPrices {
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

interface PCProduct {
  id: string;
  prices: PCPrices;
  salesVolume: number | null;
}

interface SoldListingRow {
  sold_price_cents: number;
  sold_date: string;
}

function pickPriceForGrade(prices: PCPrices, grade: string): number | null {
  const g = (grade || "").trim();
  if (!g) return prices.rawCents;
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

async function fetchPriceChartingProduct(pricechartingId: string): Promise<PCProduct | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/pricecharting-lookup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: pricechartingId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status !== "success" || !data?.product) return null;
    return data.product as PCProduct;
  } catch {
    return null;
  }
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateOffsetUTC(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function findSnapshotNear(
  supabase: SupabaseClient,
  searchKey: string,
  grade: string,
  source: "ebay" | "pricecharting",
  targetDate: string,
  toleranceDays: number,
): Promise<{ avg_price_cents: number; snapshot_date: string } | null> {
  const target = new Date(`${targetDate}T00:00:00Z`);
  const lo = new Date(target);
  lo.setUTCDate(lo.getUTCDate() - toleranceDays);
  const hi = new Date(target);
  hi.setUTCDate(hi.getUTCDate() + toleranceDays);

  const { data, error } = await supabase
    .from("price_snapshots")
    .select("avg_price_cents, snapshot_date")
    .eq("search_key", searchKey)
    .eq("grade", grade)
    .eq("source", source)
    .gte("snapshot_date", lo.toISOString().slice(0, 10))
    .lte("snapshot_date", hi.toISOString().slice(0, 10));

  if (error || !data || data.length === 0) return null;

  let best: { avg_price_cents: number; snapshot_date: string } | null = null;
  let bestDelta = Infinity;
  for (const row of data) {
    const delta = Math.abs(
      new Date(`${row.snapshot_date}T00:00:00Z`).getTime() - target.getTime(),
    );
    if (delta < bestDelta) {
      bestDelta = delta;
      best = row as { avg_price_cents: number; snapshot_date: string };
    }
  }
  return best;
}

function pctChange(current: number, prior: number): number | null {
  if (prior <= 0) return null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

function averageCents(items: SoldListingRow[]): number | null {
  if (items.length === 0) return null;
  return items.reduce((sum, item) => sum + item.sold_price_cents, 0) / items.length;
}

function filterSoldByWindow(
  items: SoldListingRow[],
  minDaysAgo: number,
  maxDaysAgo: number,
): SoldListingRow[] {
  const now = Date.now();
  const minMs = minDaysAgo * 86400000;
  const maxMs = maxDaysAgo * 86400000;
  return items.filter((item) => {
    const age = now - new Date(item.sold_date).getTime();
    return age >= minMs && age < maxMs;
  });
}

async function computeTrendFromSoldListings(
  supabase: SupabaseClient,
  row: AggregateRow,
): Promise<{
  trend7: number | null;
  trend30: number | null;
  price7d: number | null;
  price30d: number | null;
}> {
  let query = supabase
    .from("sold_listings")
    .select("sold_price_cents, sold_date")
    .eq("player_name", row.player_name)
    .eq("sport", row.sport);

  if (row.set_name) query = query.eq("set_name", row.set_name);
  if (row.year) query = query.eq("year", row.year);

  const { data, error } = await query;
  if (error || !data?.length) {
    return { trend7: null, trend30: null, price7d: null, price30d: null };
  }

  const listings = data as SoldListingRow[];
  const recent7 = filterSoldByWindow(listings, 0, 7);
  const prior7_30 = filterSoldByWindow(listings, 7, 30);
  const prior7_90 = filterSoldByWindow(listings, 7, 90);
  const priorWindow = prior7_30.length > 0 ? prior7_30 : prior7_90;

  const recentAvg = averageCents(recent7);
  const priorAvg = averageCents(priorWindow);

  let trend7: number | null = null;
  let price7d: number | null = null;
  if (recentAvg !== null && priorAvg !== null && priorAvg > 0) {
    trend7 = pctChange(recentAvg, priorAvg);
    price7d = Math.round(priorAvg);
  }

  const older30 = filterSoldByWindow(listings, 30, Number.POSITIVE_INFINITY);
  const allAvg = averageCents(listings);
  const old30Avg = averageCents(older30);

  let trend30: number | null = null;
  let price30d: number | null = null;
  if (allAvg !== null && old30Avg !== null && old30Avg > 0) {
    trend30 = pctChange(allAvg, old30Avg);
    price30d = Math.round(old30Avg);
  }

  return { trend7, trend30, price7d, price30d };
}

interface CardResult {
  search_key: string;
  grade: string;
  source: "ebay" | "pricecharting";
  avg_price_cents: number;
  trend_7d_pct: number | null;
  trend_30d_pct: number | null;
  status: "ok" | "pc_miss" | "snapshot_failed" | "update_failed";
  message?: string;
}

async function processCard(supabase: SupabaseClient, row: AggregateRow): Promise<CardResult> {
  let currentPrice = row.avg_price_cents;
  let source: "ebay" | "pricecharting" = "ebay";
  let salesVolume: number | null = null;

  if (row.pricecharting_id) {
    const pc = await fetchPriceChartingProduct(row.pricecharting_id);
    if (pc) {
      const pcPrice = pickPriceForGrade(pc.prices, row.grade);
      if (pcPrice && pcPrice > 0) {
        currentPrice = pcPrice;
        source = "pricecharting";
        salesVolume = pc.salesVolume;
      }
    }
  }

  if (!currentPrice || currentPrice <= 0) {
    return {
      search_key: row.search_key,
      grade: row.grade,
      source,
      avg_price_cents: 0,
      trend_7d_pct: null,
      trend_30d_pct: null,
      status: "pc_miss",
      message: "No valid current price",
    };
  }

  const today = todayUTC();
  const { error: snapshotErr } = await supabase.from("price_snapshots").upsert(
    {
      search_key: row.search_key,
      grade: row.grade,
      snapshot_date: today,
      source,
      avg_price_cents: currentPrice,
      num_sales: salesVolume ?? row.num_sales,
      pricecharting_id: row.pricecharting_id,
    },
    { onConflict: "search_key,grade,snapshot_date,source" },
  );

  if (snapshotErr) {
    return {
      search_key: row.search_key,
      grade: row.grade,
      source,
      avg_price_cents: currentPrice,
      trend_7d_pct: null,
      trend_30d_pct: null,
      status: "snapshot_failed",
      message: snapshotErr.message,
    };
  }

  const snap7 = await findSnapshotNear(
    supabase,
    row.search_key,
    row.grade,
    source,
    dateOffsetUTC(7),
    2,
  );
  const snap30 = await findSnapshotNear(
    supabase,
    row.search_key,
    row.grade,
    source,
    dateOffsetUTC(30),
    5,
  );

  let trend7 = snap7 ? pctChange(currentPrice, snap7.avg_price_cents) : null;
  let trend30 = snap30 ? pctChange(currentPrice, snap30.avg_price_cents) : null;
  let price7dAgo = snap7?.avg_price_cents ?? null;
  let price30dAgo = snap30?.avg_price_cents ?? null;

  if (trend7 === null || trend30 === null) {
    const fromSold = await computeTrendFromSoldListings(supabase, row);
    if (trend7 === null) {
      trend7 = fromSold.trend7;
      price7dAgo = fromSold.price7d ?? price7dAgo;
    }
    if (trend30 === null) {
      trend30 = fromSold.trend30;
      price30dAgo = fromSold.price30d ?? price30dAgo;
    }
  }

  const { error: updateErr } = await supabase
    .from("price_aggregates")
    .update({
      avg_price_cents: currentPrice,
      price_7d_ago_cents: price7dAgo,
      price_30d_ago_cents: price30dAgo,
      trend_7d_pct: trend7,
      trend_30d_pct: trend30,
      last_computed_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (updateErr) {
    return {
      search_key: row.search_key,
      grade: row.grade,
      source,
      avg_price_cents: currentPrice,
      trend_7d_pct: trend7,
      trend_30d_pct: trend30,
      status: "update_failed",
      message: updateErr.message,
    };
  }

  return {
    search_key: row.search_key,
    grade: row.grade,
    source,
    avg_price_cents: currentPrice,
    trend_7d_pct: trend7,
    trend_30d_pct: trend30,
    status: "ok",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let targetSearchKey: string | undefined;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body && typeof body.searchKey === "string") {
          targetSearchKey = body.searchKey;
        }
      } catch {
        // Body is optional.
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let query = supabase
      .from("price_aggregates")
      .select(
        "id, search_key, player_name, set_name, year, sport, grade, avg_price_cents, num_sales, pricecharting_id",
      );
    if (targetSearchKey) {
      query = query.eq("search_key", targetSearchKey);
    }

    const { data: rows, error } = await query;
    if (error) {
      throw new Error(`Failed to load price_aggregates: ${error.message}`);
    }

    const results: CardResult[] = [];
    for (const row of (rows ?? []) as AggregateRow[]) {
      results.push(await processCard(supabase, row));
    }

    const summary = {
      total: results.length,
      ok: results.filter((r) => r.status === "ok").length,
      with_trend_7d: results.filter((r) => r.trend_7d_pct !== null).length,
      with_trend_30d: results.filter((r) => r.trend_30d_pct !== null).length,
      from_pricecharting: results.filter((r) => r.source === "pricecharting").length,
      from_ebay: results.filter((r) => r.source === "ebay").length,
      pc_miss: results.filter((r) => r.status === "pc_miss").length,
      snapshot_failed: results.filter((r) => r.status === "snapshot_failed").length,
      update_failed: results.filter((r) => r.status === "update_failed").length,
    };

    return new Response(JSON.stringify({ summary, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
