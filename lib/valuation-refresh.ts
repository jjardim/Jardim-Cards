import { supabase } from "@/lib/supabase";

export const FREE_DAILY_REFRESH_LIMIT = 3;

export type RefreshScope = "portfolio" | "card";
export type UserPlan = "free" | "pro";

export interface RefreshQuota {
  used: number;
  limit: number;
  remaining: number;
  isPro: boolean;
}

export interface ConsumeRefreshResult {
  ok: boolean;
  quota: RefreshQuota;
  message?: string;
}

function todayStartIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00`;
}

export async function fetchUserPlan(userId: string): Promise<UserPlan> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.plan) return "free";
  return data.plan === "pro" ? "pro" : "free";
}

export async function getRefreshQuota(userId: string): Promise<RefreshQuota> {
  const plan = await fetchUserPlan(userId);
  const isPro = plan === "pro";

  if (isPro) {
    return {
      used: 0,
      limit: FREE_DAILY_REFRESH_LIMIT,
      remaining: FREE_DAILY_REFRESH_LIMIT,
      isPro: true,
    };
  }

  const { count, error } = await supabase
    .from("valuation_refresh_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("refreshed_at", todayStartIso());

  if (error) throw error;

  const used = count ?? 0;
  const remaining = Math.max(0, FREE_DAILY_REFRESH_LIMIT - used);

  return {
    used,
    limit: FREE_DAILY_REFRESH_LIMIT,
    remaining,
    isPro: false,
  };
}

export async function consumeRefreshQuota(
  userId: string,
  scope: RefreshScope
): Promise<ConsumeRefreshResult> {
  const quota = await getRefreshQuota(userId);

  if (quota.isPro) {
    const { error } = await supabase.from("valuation_refresh_log").insert({
      user_id: userId,
      scope,
    });
    if (error) throw error;
    return { ok: true, quota };
  }

  if (quota.remaining <= 0) {
    return {
      ok: false,
      quota,
      message: "No refreshes left today. Pro unlocks unlimited refresh.",
    };
  }

  const { error } = await supabase.from("valuation_refresh_log").insert({
    user_id: userId,
    scope,
  });
  if (error) throw error;

  const nextQuota = await getRefreshQuota(userId);
  return { ok: true, quota: nextQuota };
}
