import type { ComponentType } from "react";

export const WIDGET_IDS = [
  "hottest",
  "portfolio",
  "discover",
  "market-stats",
  "sport-mix",
  "hot-carousel",
  "trend-list",
  "recent-sold",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export type WidgetTier = "free" | "pro";

export type DashboardFilterKey = "sport" | "era" | "priceTier";

export interface DashboardFilters {
  sport: string;
  eraIdx: number;
  tierIdx: number;
}

export interface DashboardEra {
  min?: number;
  max?: number;
}

export interface DashboardPriceTier {
  min: number;
  max: number;
}

export interface DashboardQueryContext {
  userId: string | undefined;
  sport: string;
  eraMin: number | undefined;
  eraMax: number | undefined;
}

export interface WidgetComponentProps {
  locked?: boolean;
}

export interface WidgetDefinitionMeta {
  id: WidgetId;
  title: string;
  description: string;
  tier: WidgetTier;
  defaultEnabled: boolean;
  defaultOrder: number;
  usesFilters?: DashboardFilterKey[];
  queryKeys: (ctx: DashboardQueryContext) => readonly (readonly unknown[])[];
}

export type WidgetComponent = ComponentType<WidgetComponentProps>;

export interface DashboardLayout {
  widgetOrder: WidgetId[];
}

export function isWidgetId(value: string): value is WidgetId {
  return (WIDGET_IDS as readonly string[]).includes(value);
}
