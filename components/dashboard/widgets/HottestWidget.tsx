import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { HottestHero } from "@/components/HottestHero";
import { fetchTrending } from "@/lib/api";
import { buildCardDetailHref } from "@/lib/card-routes";
import { useDashboardContext } from "@/lib/dashboard/dashboard-context";
import { processTrendingCards, pickTopGainer } from "@/lib/trending-utils";
import { SPORTS, type MarketMover, type Sport } from "@/lib/types";
import type { WidgetComponentProps } from "@/lib/dashboard/types";

export function HottestWidget(_props: WidgetComponentProps) {
  const router = useRouter();
  const { era, tier } = useDashboardContext();

  const categoryTrendQueries = useQueries({
    queries: SPORTS.map((s) => ({
      queryKey: ["trending", s, era.min, era.max],
      queryFn: () => fetchTrending(s, era.min, era.max),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const hottestBySport = useMemo(() => {
    const result: Partial<Record<Sport, MarketMover>> = {};
    SPORTS.forEach((s, i) => {
      const data = categoryTrendQueries[i]?.data ?? [];
      const top = pickTopGainer(processTrendingCards(data, tier));
      if (top) result[s] = top;
    });
    return result;
  }, [categoryTrendQueries, tier]);

  return (
    <HottestHero
      hottestBySport={hottestBySport}
      onPress={(card) => router.push(buildCardDetailHref(card) as never)}
    />
  );
}
