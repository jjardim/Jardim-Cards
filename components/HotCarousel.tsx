import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { CardImage } from "./CardImage";
import { TrendBadge } from "./TrendBadge";
import { formatCents } from "@/lib/utils";
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
    <View style={{ marginTop: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181b", marginBottom: 12 }}>
        Hot Right Now
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 4 }}
        decelerationRate="fast"
        snapToInterval={164}
      >
        {top5.map((card, i) => (
          <TouchableOpacity
            key={card.searchKey}
            activeOpacity={0.7}
            onPress={() => router.push(`/card/${card.searchKey}`)}
            style={{
              width: 152,
              backgroundColor: "#fff",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#e4e4e7",
              overflow: "hidden",
            }}
          >
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
              <View style={{ position: "relative" }}>
                <CardImage
                  imageUrl={card.imageUrl}
                  playerName={card.playerName}
                  setName={card.setName}
                  year={card.year}
                  width={110}
                  height={154}
                  borderRadius={8}
                />
                <View
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    backgroundColor: "rgba(0,0,0,0.65)",
                    borderRadius: 10,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>#{i + 1}</Text>
                </View>
              </View>
            </View>
            <View style={{ paddingHorizontal: 10, paddingBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#18181b" }} numberOfLines={1}>
                {card.playerName}
              </Text>
              <Text style={{ fontSize: 11, color: "#71717a", marginTop: 1 }} numberOfLines={1}>
                {card.setName} {card.year ? `(${card.year})` : ""}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#18181b" }}>
                  {formatCents(card.avgPriceCents)}
                </Text>
                <TrendBadge pct={card.trend7dPct} />
              </View>
              <Text style={{ fontSize: 10, color: "#a1a1aa", marginTop: 3 }}>
                {card.numSales} sales
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
