import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TrendingParams {
  sport?: string;
  yearMin?: number;
  yearMax?: number;
  limit?: number;
  sortBy?: "trend_7d" | "trend_30d" | "volume" | "price";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { sport, yearMin, yearMax, limit = 20, sortBy = "trend_7d" } = body as TrendingParams;

    let query = supabase
      .from("price_aggregates")
      .select("*")
      .gt("num_sales", 0);

    if (sport) query = query.eq("sport", sport);
    if (yearMin) query = query.gte("year", yearMin);
    if (yearMax) query = query.lte("year", yearMax);

    switch (sortBy) {
      case "trend_30d":
        query = query.order("trend_30d_pct", { ascending: false, nullsFirst: false });
        break;
      case "volume":
        query = query.order("num_sales", { ascending: false });
        break;
      case "price":
        query = query.order("avg_price_cents", { ascending: false });
        break;
      default:
        query = query.order("trend_7d_pct", { ascending: false, nullsFirst: false });
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    const trending = (data ?? []).map((row: Record<string, unknown>) => ({
      searchKey: row.search_key,
      playerName: row.player_name,
      setName: row.set_name,
      year: row.year,
      sport: row.sport,
      imageUrl: row.image_url ?? null,
      avgPriceCents: row.avg_price_cents,
      // Preserve null — UI shows "—" when no 7d baseline exists.
      trend7dPct: (row.trend_7d_pct as number | null) ?? null,
      trend30dPct: (row.trend_30d_pct as number | null) ?? null,
      numSales: row.num_sales,
    }));

    return new Response(JSON.stringify({ trending, count: trending.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", Connection: "keep-alive" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
