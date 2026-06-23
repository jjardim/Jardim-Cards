import type { DashboardEra, DashboardFilters, DashboardPriceTier } from "./types";

export const DASHBOARD_ERAS = [
  { label: "All", min: undefined, max: undefined },
  { label: "Vintage", min: 1900, max: 1969 },
  { label: "70s", min: 1970, max: 1979 },
  { label: "80s", min: 1980, max: 1989 },
  { label: "90s", min: 1990, max: 1999 },
  { label: "2000s", min: 2000, max: 2009 },
  { label: "2010s", min: 2010, max: 2019 },
  { label: "Modern", min: 2020, max: undefined },
] as const;

export const DASHBOARD_PRICE_TIERS = [
  { label: "All Prices", min: 0, max: Infinity },
  { label: "Budget", sublabel: "$1-25", min: 100, max: 2500 },
  { label: "Mid", sublabel: "$25-100", min: 2500, max: 10000 },
  { label: "Premium", sublabel: "$100+", min: 10000, max: Infinity },
] as const;

export function resolveDashboardEra(filters: DashboardFilters): DashboardEra {
  return DASHBOARD_ERAS[filters.eraIdx] ?? DASHBOARD_ERAS[0];
}

export function resolveDashboardPriceTier(filters: DashboardFilters): DashboardPriceTier {
  return DASHBOARD_PRICE_TIERS[filters.tierIdx] ?? DASHBOARD_PRICE_TIERS[0];
}
