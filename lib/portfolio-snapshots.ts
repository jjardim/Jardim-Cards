import { supabase } from "@/lib/supabase";
import type { PortfolioSnapshot } from "@/lib/types";

/** Local calendar date (YYYY-MM-DD) for snapshot rows. */
export function todaySnapshotDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function fetchLatestPortfolioSnapshot(
  userId: string
): Promise<PortfolioSnapshot | null> {
  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchPortfolioSnapshots(
  userId: string,
  days = 90
): Promise<PortfolioSnapshot[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("*")
    .eq("user_id", userId)
    .gte("snapshot_date", sinceStr)
    .order("snapshot_date", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function upsertPortfolioSnapshot(params: {
  userId: string;
  totalValueCents: number;
  totalCostCents: number;
  cardCount: number;
}): Promise<void> {
  const { error } = await supabase.from("portfolio_snapshots").upsert(
    {
      user_id: params.userId,
      snapshot_date: todaySnapshotDate(),
      total_value_cents: params.totalValueCents,
      total_cost_cents: params.totalCostCents,
      card_count: params.cardCount,
    },
    { onConflict: "user_id,snapshot_date" }
  );

  if (error) throw error;
}
