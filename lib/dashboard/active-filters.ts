import { WIDGET_REGISTRY } from "./registry";
import type { DashboardFilterKey, WidgetId } from "./types";

export interface ActiveDashboardFilters {
  sport: boolean;
  era: boolean;
  priceTier: boolean;
  /** True when at least one enabled widget reads global filters. */
  any: boolean;
}

/** Which filter rows to show based on enabled home widgets' `usesFilters`. */
export function getActiveDashboardFilters(widgetIds: WidgetId[]): ActiveDashboardFilters {
  const keys = new Set<DashboardFilterKey>();

  for (const id of widgetIds) {
    const def = WIDGET_REGISTRY[id];
    def.usesFilters?.forEach((key) => keys.add(key));
  }

  return {
    sport: keys.has("sport"),
    era: keys.has("era"),
    priceTier: keys.has("priceTier"),
    any: keys.size > 0,
  };
}
