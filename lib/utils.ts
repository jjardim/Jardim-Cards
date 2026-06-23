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

/** Short sold date for comp links, e.g. "Mar 8". */
export function formatCompSaleDate(isoDate: string): string {
  const dateOnly = isoDate.match(/^(\d{4}-\d{2}-\d{2})/);
  const parsed = dateOnly ? new Date(`${dateOnly[1]}T12:00:00`) : new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Sold comp chip / row label, e.g. "Sold · Jun 23". */
export function formatSoldCompLabel(isoDate: string): string {
  return `Sold · ${formatCompSaleDate(isoDate)}`;
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
