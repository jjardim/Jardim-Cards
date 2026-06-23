import { View } from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { StatCard } from "@/components/StatCard";
import { buildCardDetailHref } from "@/lib/card-routes";
import { useFilteredTrending } from "@/lib/dashboard/use-filtered-trending";
import { formatPct } from "@/lib/utils";
import { palette } from "@/lib/theme";
import type { WidgetComponentProps } from "@/lib/dashboard/types";

export function MarketStatsWidget(_props: WidgetComponentProps) {
  const router = useRouter();
  const { filtered, withTrend, losers } = useFilteredTrending();

  const topDecliner = losers[0] ?? null;
  const totalVolume = filtered.reduce((s, c) => s + c.numSales, 0);
  const avgTrend =
    withTrend.length > 0
      ? withTrend.reduce((s, c) => s + c.trend7dPct, 0) / withTrend.length
      : null;

  if (filtered.length === 0 && !topDecliner) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <StatCard
            label="Tracked"
            value={filtered.length.toString()}
            subtitle="cards with sales"
            icon={<FontAwesome name="list" size={12} color={palette.primary} />}
          />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard
            label="Avg Move"
            value={avgTrend !== null ? formatPct(avgTrend) : "\u2014"}
            subtitle={
              withTrend.length > 0
                ? `${totalVolume.toLocaleString()} comps tracked`
                : `${filtered.length} cards \u00b7 building 7d baselines`
            }
            accent={palette.successBg}
            icon={<FontAwesome name="line-chart" size={12} color={palette.success} />}
          />
        </View>
      </View>

      {topDecliner && (
        <View style={{ marginTop: 10 }}>
          <StatCard
            label="Biggest Drop"
            value={topDecliner.playerName}
            trend={topDecliner.trend7dPct}
            subtitle={topDecliner.setName ?? undefined}
            accent={palette.dangerBg}
            icon={<FontAwesome name="arrow-down" size={11} color={palette.danger} />}
            onPress={() => router.push(buildCardDetailHref(topDecliner) as never)}
          />
        </View>
      )}
    </View>
  );
}
