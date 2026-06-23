import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { CardImage } from "@/components/CardImage";
import { TrendBadge } from "@/components/TrendBadge";
import { buildCardDetailHref } from "@/lib/card-routes";
import { useFilteredTrending } from "@/lib/dashboard/use-filtered-trending";
import { formatCents } from "@/lib/utils";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";
import type { WidgetComponentProps } from "@/lib/dashboard/types";

type TrendTab = "gainers" | "losers";

export function TrendListWidget(_props: WidgetComponentProps) {
  const router = useRouter();
  const [trendTab, setTrendTab] = useState<TrendTab>("gainers");
  const { gainers, losers, isLoading } = useFilteredTrending();
  const trendList = trendTab === "gainers" ? gainers : losers;

  return (
    <View style={{ marginTop: 24 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 20 }}>{trendTab === "gainers" ? "\uD83D\uDE80" : "\uD83D\uDCC9"}</Text>
          <Text style={{ fontSize: 18, fontWeight: "700", color: palette.text, letterSpacing: -0.3 }}>
            {trendTab === "gainers" ? "Top Gainers" : "Top Losers"}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: palette.surface,
            borderRadius: radius.pill,
            padding: 3,
            ...shadow.sm,
          }}
        >
          <TouchableOpacity
            onPress={() => setTrendTab("gainers")}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: trendTab === "gainers" ? palette.success : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: trendTab === "gainers" ? palette.textInverse : palette.textMuted,
              }}
            >
              Gainers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTrendTab("losers")}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: trendTab === "losers" ? palette.danger : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: trendTab === "losers" ? palette.textInverse : palette.textMuted,
              }}
            >
              Losers
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {trendList.length === 0 && !isLoading && (
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            padding: 28,
            alignItems: "center",
            ...shadow.sm,
          }}
        >
          <Text style={{ fontSize: 13, color: palette.textSubtle }}>
            No {trendTab === "gainers" ? "gainers" : "losers"} for this filter
          </Text>
        </View>
      )}

      {trendList.map((card, i) => {
        const theme = getSportTheme(card.sport);
        return (
          <TouchableOpacity
            key={`${card.searchKey}:${card.grade ?? ""}`}
            activeOpacity={0.7}
            onPress={() => router.push(buildCardDetailHref(card) as never)}
            style={{
              backgroundColor: palette.surface,
              borderRadius: radius.lg,
              padding: 12,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              ...shadow.sm,
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: radius.pill,
                backgroundColor: theme.bg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: theme.color }}>{i + 1}</Text>
            </View>
            <CardImage
              imageUrl={card.imageUrl}
              playerName={card.playerName}
              setName={card.setName}
              year={card.year}
              width={48}
              height={67}
              borderRadius={6}
            />
            <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: palette.text }}>
                {card.playerName}
              </Text>
              <Text style={{ fontSize: 12, color: palette.textMuted, marginTop: 2 }} numberOfLines={1}>
                {card.setName} {card.year ? `(${card.year})` : ""}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: palette.text,
                  marginTop: 4,
                  letterSpacing: -0.3,
                }}
              >
                {formatCents(card.avgPriceCents)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <TrendBadge pct={card.trend7dPct} />
              <Text style={{ fontSize: 10, color: palette.textSubtle }}>{card.numSales} sales</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
