import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PushMessage {
  userId: string;
  token: string;
  kind: string;
  dedupeKey: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  const formatted = `$${(abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return cents < 0 ? `−${formatted}` : formatted;
}

function formatSignedCents(cents: number): string {
  const prefix = cents >= 0 ? "+" : "−";
  return `${prefix}${formatCents(Math.abs(cents))}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function sendExpoPush(messages: PushMessage[]): Promise<number> {
  if (messages.length === 0) return 0;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const dedupeKeys = messages.map((m) => m.dedupeKey);
  const { data: existing } = await admin
    .from("notification_log")
    .select("dedupe_key")
    .in("dedupe_key", dedupeKeys);

  const sentKeys = new Set((existing ?? []).map((r) => r.dedupe_key as string));
  const pending = messages.filter((m) => !sentKeys.has(m.dedupeKey));
  if (pending.length === 0) return 0;

  const expoPayload = pending.map((m) => ({
    to: m.token,
    title: m.title,
    body: m.body,
    data: m.data ?? {},
    sound: "default",
  }));

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(expoPayload),
  });

  if (!res.ok) {
    console.error("Expo push failed", await res.text());
    return 0;
  }

  const logRows = pending.map((m) => ({
    user_id: m.userId,
    kind: m.kind,
    dedupe_key: m.dedupeKey,
    title: m.title,
    body: m.body,
  }));

  await admin.from("notification_log").insert(logRows);
  return pending.length;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const dateKey = todayKey();
  const messages: PushMessage[] = [];

  const { data: prefsRows } = await admin.from("notification_preferences").select("*");
  if (!prefsRows?.length) {
    return new Response(JSON.stringify({ sent: 0, message: "no preferences" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const prefs of prefsRows) {
    const userId = prefs.user_id as string;

    const { data: tokens } = await admin
      .from("push_tokens")
      .select("expo_push_token")
      .eq("user_id", userId);

    if (!tokens?.length) continue;
    const token = tokens[0].expo_push_token as string;

    if (prefs.daily_digest) {
      const { data: snapshots } = await admin
        .from("portfolio_snapshots")
        .select("snapshot_date, total_value_cents, total_cost_cents, card_count")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false })
        .limit(2);

      if (snapshots && snapshots.length >= 2) {
        const [latest, previous] = snapshots;
        const delta = latest.total_value_cents - previous.total_value_cents;
        messages.push({
          userId,
          token,
          kind: "daily_digest",
          dedupeKey: `daily_digest:${userId}:${dateKey}`,
          title: `Portfolio ${formatSignedCents(delta)} today`,
          body: `Market value ${formatCents(latest.total_value_cents)} · ${latest.card_count} cards`,
          data: { url: "/portfolio" },
        });
      }
    }

    if (prefs.portfolio_move) {
      const threshold = (prefs.portfolio_move_pct as number) ?? 5;
      const { data: snapshots } = await admin
        .from("portfolio_snapshots")
        .select("snapshot_date, total_value_cents")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false })
        .limit(2);

      if (snapshots && snapshots.length >= 2) {
        const [latest, previous] = snapshots;
        if (previous.total_value_cents > 0) {
          const pct =
            ((latest.total_value_cents - previous.total_value_cents) /
              previous.total_value_cents) *
            100;
          if (Math.abs(pct) >= threshold) {
            const sign = pct >= 0 ? "+" : "−";
            messages.push({
              userId,
              token,
              kind: "portfolio_move",
              dedupeKey: `portfolio_move:${userId}:${dateKey}`,
              title: `Portfolio moved ${sign}${Math.abs(pct).toFixed(1)}% today`,
              body: `Now ${formatCents(latest.total_value_cents)} · tap to review`,
              data: { url: "/portfolio" },
            });
          }
        }
      }
    }

    if (prefs.watchlist_target) {
      const { data: watchlist } = await admin
        .from("watchlist_cards")
        .select("id, player_name, search_key, grade, target_price_cents")
        .eq("user_id", userId)
        .not("target_price_cents", "is", null);

      for (const row of watchlist ?? []) {
        if (!row.search_key || row.target_price_cents == null) continue;

        const { data: aggregates } = await admin
          .from("price_aggregates")
          .select("avg_price_cents, grade")
          .eq("search_key", row.search_key);

        const match =
          (aggregates ?? []).find((a) => a.grade === row.grade) ??
          (aggregates ?? []).find((a) => !a.grade || a.grade === "Raw") ??
          aggregates?.[0];

        if (!match?.avg_price_cents) continue;
        if (match.avg_price_cents > row.target_price_cents) continue;

        messages.push({
          userId,
          token,
          kind: "watchlist_target",
          dedupeKey: `watchlist_target:${row.id}:${dateKey}`,
          title: `Price alert: ${row.player_name}`,
          body: `At or below ${formatCents(row.target_price_cents)} · now ${formatCents(match.avg_price_cents)}`,
          data: { url: "/watchlist" },
        });
      }
    }

    if (prefs.profit_target) {
      const targetPct = (prefs.profit_target_pct as number) ?? 20;
      const { data: cards } = await admin
        .from("portfolio_cards")
        .select("id, player_name, search_key, grade, purchase_price_cents, quantity")
        .eq("user_id", userId);

      for (const card of cards ?? []) {
        if (!card.search_key || card.purchase_price_cents <= 0) continue;
        const cost = card.purchase_price_cents * card.quantity;
        if (cost <= 0) continue;

        const { data: aggregates } = await admin
          .from("price_aggregates")
          .select("avg_price_cents, grade")
          .eq("search_key", card.search_key);

        const match =
          (aggregates ?? []).find((a) => a.grade === card.grade) ??
          (aggregates ?? []).find((a) => !a.grade || a.grade === "Raw") ??
          aggregates?.[0];

        if (!match?.avg_price_cents) continue;

        const current = match.avg_price_cents * card.quantity;
        const plPct = ((current - cost) / cost) * 100;
        if (plPct < targetPct) continue;

        messages.push({
          userId,
          token,
          kind: "profit_target",
          dedupeKey: `profit_target:${card.id}:${dateKey}`,
          title: `Ready to sell: ${card.player_name}`,
          body: `Up ${plPct.toFixed(0)}% · at your ${targetPct}% target`,
          data: { url: "/portfolio" },
        });
      }
    }
  }

  const sent = await sendExpoPush(messages);

  return new Response(JSON.stringify({ sent, queued: messages.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
