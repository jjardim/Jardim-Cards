import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetchUserPlan } from "@/lib/valuation-refresh";
import {
  resolveDashboardEra,
  resolveDashboardPriceTier,
} from "./filters";
import type {
  DashboardEra,
  DashboardFilters,
  DashboardPriceTier,
  DashboardQueryContext,
} from "./types";

interface DashboardContextValue {
  filters: DashboardFilters;
  setFilters: Dispatch<SetStateAction<DashboardFilters>>;
  era: DashboardEra;
  tier: DashboardPriceTier;
  plan: "free" | "pro";
  queryContext: DashboardQueryContext;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<DashboardFilters>({
    sport: "",
    eraIdx: 0,
    tierIdx: 0,
  });

  const { data: plan = "free" } = useQuery({
    queryKey: ["user-plan", user?.id],
    queryFn: () => fetchUserPlan(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const era = useMemo(() => resolveDashboardEra(filters), [filters]);
  const tier = useMemo(() => resolveDashboardPriceTier(filters), [filters]);

  const queryContext = useMemo<DashboardQueryContext>(
    () => ({
      userId: user?.id,
      sport: filters.sport,
      eraMin: era.min,
      eraMax: era.max,
    }),
    [user?.id, filters.sport, era.min, era.max]
  );

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      era,
      tier,
      plan,
      queryContext,
    }),
    [filters, era, tier, plan, queryContext]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardContext must be used within DashboardProvider");
  }
  return ctx;
}

