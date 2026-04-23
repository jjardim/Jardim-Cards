import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { CardImage } from "./CardImage";
import { TrendBadge } from "./TrendBadge";
import { formatCents } from "@/lib/utils";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";
import type { MarketMover } from "@/lib/types";

interface HotCarouselProps {
  cards: MarketMover[];
}

export function HotCarousel({ cards }: HotCarouselProps) {
  const router = useRouter();

  const top5 = cards
    .slice()
    .sort((a, b) => Math.abs(b.trend7dPct) - Math.abs(a.trend7dPct))
    .slice(0, 5);

  if (top5.length === 0) return null;

  return (
    <View style={{ marginTop: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Text style={{ fontSize: 20 }}>{"\uD83D\uDD25"}</Text>
        <Text style={{ fontSize: 18, fontWeight: "700", color: palette.text, letterSpacing: -0.3 }}>
          Hot Right Now
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 4, paddingBottom: 6 }}
        decelerationRate="fast"
        snapToInterval={176}
      >
        {top5.map((card, i) => {
          const sport = getSportTheme(card.sport);
          return (
            <TouchableOpacity
              key={card.searchKey}
              activeOpacity={0.75}
              onPress={() => router.push(`/card/${card.searchKey}`)}
              style={{
                width: 164,
                backgroundColor: palette.surface,
                borderRadius: radius.lg,
                overflow: "hidden",
                ...shadow.sm,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 14,
                  paddingBottom: 10,
                  backgroundColor: sport.bg,
                }}
              >
                <View style={{ position: "relative" }}>
                  <CardImage
                    imageUrl={card.imageUrl}
                    playerName={card.playerName}
                    setName={card.setName}
                    year={card.year}
                    width={120}
                    height={168}
                    borderRadius={10}
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: 6,
                      left: 6,
                      backgroundColor: palette.heroDark,
                      borderRadius: radius.pill,
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ color: palette.textInverse, fontSize: 11, fontWeight: "800" }}>
                      #{i + 1}
                    </Text>
                  </View>
                  <View
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      backgroundColor: "rgba(255,255,255,0.95)",
                      borderRadius: radius.pill,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 12 }}>{sport.emoji}</Text>
                  </View>
                </View>
              </View>
              <View style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: palette.text }} numberOfLines={1}>
                  {card.playerName}
                </Text>
                <Text style={{ fontSize: 11, color: palette.textMuted, marginTop: 2 }} numberOfLines={1}>
                  {card.setName} {card.year ? `(${card.year})` : ""}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 8,
                  }}
                >
                  <Text
                    style={{ fontSize: 15, fontWeight: "700", color: palette.text, letterSpacing: -0.3 }}
                  >
                    {formatCents(card.avgPriceCents)}
                  </Text>
                  <TrendBadge pct={card.trend7dPct} />
                </View>
                <Text style={{ fontSize: 10, color: palette.textSubtle, marginTop: 4 }}>
                  {card.numSales} sales
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
