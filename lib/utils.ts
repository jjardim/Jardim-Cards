export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatPct(pct: number | null): string {
  if (pct === null || pct === undefined) return "N/A";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function trendColor(pct: number | null): "green" | "red" | "gray" {
  if (pct === null || pct === undefined) return "gray";
  if (pct > 0) return "green";
  if (pct < 0) return "red";
  return "gray";
}

export function generateSearchKey(params: {
  year?: number | null;
  set_name?: string | null;
  player_name: string;
  card_number?: string | null;
}): string {
  const parts = [
    params.year?.toString(),
    params.set_name,
    params.player_name,
    params.card_number,
  ]
    .filter(Boolean)
    .map((s) =>
      (s as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  return parts.join("-");
}
