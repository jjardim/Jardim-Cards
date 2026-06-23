import { SPORTS } from "@/lib/types";
import type { DashboardQueryContext, WidgetDefinitionMeta, WidgetId } from "./types";

export const WIDGET_DEFINITIONS: WidgetDefinitionMeta[] = [
  {
    id: "hottest",
    title: "Hottest in Category",
    description: "Top 7d gainer per sport",
    tier: "free",
    defaultEnabled: true,
    defaultOrder: 0,
    usesFilters: ["era", "priceTier"],
    queryKeys: (ctx) =>
      SPORTS.map((s) => ["trending", s, ctx.eraMin, ctx.eraMax] as const),
  },
  {
    id: "portfolio",
    title: "Your Portfolio",
    description: "Market value and all-time P/L",
    tier: "free",
    defaultEnabled: true,
    defaultOrder: 1,
    queryKeys: (ctx) => [
      ["portfolio", ctx.userId],
      ["portfolio-valuations", ctx.userId],
      ["portfolio-snapshot-latest", ctx.userId],
    ],
  },
  {
    id: "discover",
    title: "Discover",
    description: "Hot cards not in your collection",
    tier: "free",
    defaultEnabled: true,
    defaultOrder: 2,
    usesFilters: ["era"],
    queryKeys: (ctx) => [
      ...SPORTS.map((s) => ["trending", s, ctx.eraMin, ctx.eraMax] as const),
      ["portfolio", ctx.userId],
      ["watchlist"],
    ],
  },
  {
    id: "market-stats",
    title: "Market Stats",
    description: "Tracked cards, avg move, biggest drop",
    tier: "free",
    defaultEnabled: true,
    defaultOrder: 3,
    usesFilters: ["sport", "era", "priceTier"],
    queryKeys: (ctx) => [["trending", ctx.sport, ctx.eraMin, ctx.eraMax]],
  },
  {
    id: "sport-mix",
    title: "Sport Mix",
    description: "Category breakdown of trending cards",
    tier: "free",
    defaultEnabled: true,
    defaultOrder: 4,
    usesFilters: ["sport", "era", "priceTier"],
    queryKeys: (ctx) => [["trending", ctx.sport, ctx.eraMin, ctx.eraMax]],
  },
  {
    id: "hot-carousel",
    title: "Hot Right Now",
    description: "Horizontal carousel of trending cards",
    tier: "free",
    defaultEnabled: true,
    defaultOrder: 5,
    usesFilters: ["sport", "era", "priceTier"],
    queryKeys: (ctx) => [["trending", ctx.sport, ctx.eraMin, ctx.eraMax]],
  },
  {
    id: "trend-list",
    title: "Top Gainers & Losers",
    description: "Ranked list with gainers/losers toggle",
    tier: "free",
    defaultEnabled: true,
    defaultOrder: 6,
    usesFilters: ["sport", "era", "priceTier"],
    queryKeys: (ctx) => [["trending", ctx.sport, ctx.eraMin, ctx.eraMax]],
  },
  {
    id: "recent-sold",
    title: "Recently Sold",
    description: "Latest eBay sold comps",
    tier: "free",
    defaultEnabled: true,
    defaultOrder: 7,
    usesFilters: ["sport", "era"],
    queryKeys: (ctx) => [["recent-sales", ctx.sport || undefined, ctx.eraMin, ctx.eraMax]],
  },
];

export const WIDGET_REGISTRY: Record<WidgetId, WidgetDefinitionMeta> = WIDGET_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.id] = def;
    return acc;
  },
  {} as Record<WidgetId, WidgetDefinitionMeta>
);

export const DEFAULT_WIDGET_ORDER: WidgetId[] = [...WIDGET_DEFINITIONS]
  .filter((def) => def.defaultEnabled)
  .sort((a, b) => a.defaultOrder - b.defaultOrder)
  .map((def) => def.id);

export function getWidgetQueryKeys(
  widgetIds: WidgetId[],
  ctx: DashboardQueryContext
): (readonly unknown[])[] {
  const keys: (readonly unknown[])[] = [];
  const seen = new Set<string>();

  for (const id of widgetIds) {
    for (const key of WIDGET_REGISTRY[id].queryKeys(ctx)) {
      const serialized = JSON.stringify(key);
      if (!seen.has(serialized)) {
        seen.add(serialized);
        keys.push(key);
      }
    }
  }

  return keys;
}

export function canUseWidget(tier: WidgetDefinitionMeta["tier"], plan: "free" | "pro"): boolean {
  return tier === "free" || plan === "pro";
}
