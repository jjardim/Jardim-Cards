import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchPortfolioValuation } from "@/lib/api";
import { toValuationInput } from "@/lib/valuation";
import type { PortfolioValuation } from "@/lib/api";
import type { PortfolioCard } from "@/lib/types";
import { loadPersistedValuations, persistValuations } from "@/lib/valuation-persist";

export function usePortfolioValuations(cards: PortfolioCard[], userId: string | undefined) {
  const cardIdsKey = useMemo(() => cards.map((c) => c.id).join(","), [cards]);

  const persisted = useMemo(() => {
    if (!userId || !cardIdsKey) return null;
    return loadPersistedValuations(userId, cardIdsKey);
  }, [userId, cardIdsKey]);

  const query = useQuery<Record<string, PortfolioValuation | null>>({
    queryKey: ["portfolio-valuations", userId, cardIdsKey],
    queryFn: async () => {
      const results: Record<string, PortfolioValuation | null> = {};
      await Promise.all(
        cards.map(async (card) => {
          results[card.id] = await fetchPortfolioValuation(toValuationInput(card));
        })
      );
      if (userId) persistValuations(userId, cardIdsKey, results);
      return results;
    },
    enabled: cards.length > 0 && !!userId,
    initialData: persisted?.valuations,
    initialDataUpdatedAt: persisted?.savedAt,
    staleTime: 1000 * 60 * 60 * 4,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    refetchOnMount: !persisted || !Object.values(persisted.valuations).some(Boolean),
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const valuations = query.data ?? {};
  const hasValuations = Object.values(valuations).some(Boolean);

  return {
    valuations,
    hasValuations,
    valuationsLoading: query.isLoading && !hasValuations,
    isFetching: query.isFetching,
    dataUpdatedAt: query.dataUpdatedAt,
    cardIdsKey,
  };
}
