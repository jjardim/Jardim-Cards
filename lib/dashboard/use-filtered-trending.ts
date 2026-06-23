import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTrending } from "@/lib/api";
import { processTrendingCards, splitTrendLists } from "@/lib/trending-utils";
import { useDashboardContext } from "./dashboard-context";

/** Shared trending query for filter-aware dashboard widgets. React Query dedupes by key. */
export function useFilteredTrending() {
  const { filters, era, tier } = useDashboardContext();

  const { data: trending = [], isLoading, isFetching } = useQuery({
    queryKey: ["trending", filters.sport, era.min, era.max],
    queryFn: () => fetchTrending(filters.sport || undefined, era.min, era.max),
    staleTime: 1000 * 60 * 5,
  });

  const filtered = useMemo(() => processTrendingCards(trending, tier), [trending, tier]);
  const lists = useMemo(() => splitTrendLists(filtered), [filtered]);

  return {
    trending,
    filtered,
    isLoading,
    isFetching,
    ...lists,
  };
}
