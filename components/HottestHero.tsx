import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { CardImage } from "./CardImage";
import { formatCents, formatPct } from "@/lib/utils";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";
import type { MarketMover } from "@/lib/types";

interface HottestHeroProps {
  card: MarketMover;
  onPress: () => void;
}

export function HottestHero({ card, onPress }: HottestHeroProps) {
  const sport = getSportTheme(card.sport);
  const isGainer = (card.trend7dPct ?? 0) >= 0;
  const deltaColor = isGainer ? "#4ade80" : "#fb7185";
  const deltaBg = isGainer ? "rgba(74,222,128,0.15)" : "rgba(251,113,133,0.15)";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        backgroundColor: palette.heroDark,
        borderRadius: radius.xl,
        padding: 18,
        marginTop: 18,
        overflow: "hidden",
        ...shadow.md,
      }}
    >
      {/* Decorative sport-colored glow */}
      <View
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: sport.color,
          opacity: 0.22,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -50,
          left: -30,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: palette.primary,
          opacity: 0.15,
        }}
      />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.12)",
            borderRadius: radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 4,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 12 }}>{"\uD83D\uDD25"}</Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: palette.textInverse,
              letterSpacing: 0.5,
            }}
          >
            HOTTEST CARD
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 4,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 11 }}>{sport.emoji}</Text>
          <Text
            style={{ fontSize: 10, fontWeight: "700", color: palette.textInverseMuted, letterSpacing: 0.3 }}
          >
            {sport.label.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginTop: 16, gap: 14 }}>
        <View style={{ ...shadow.md }}>
          <CardImage
            imageUrl={card.imageUrl}
            playerName={card.playerName}
            setName={card.setName}
            year={card.year}
            width={108}
            height={150}
            borderRadius={12}
          />
        </View>

        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: palette.textInverse,
                letterSpacing: -0.3,
              }}
              numberOfLines={2}
            >
              {card.playerName}
            </Text>
            <Text
              style={{ fontSize: 12, color: palette.textInverseMuted, marginTop: 3 }}
              numberOfLines={1}
            >
              {card.setName}
              {card.year ? ` \u00B7 ${card.year}` : ""}
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: 11,
                color: palette.textInverseMuted,
                fontWeight: "600",
                letterSpacing: 0.4,
                marginTop: 8,
              }}
            >
              AVG PRICE
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: palette.textInverse,
                letterSpacing: -0.6,
                marginTop: 2,
              }}
            >
              {formatCents(card.avgPriceCents)}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: deltaBg,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                }}
              >
                <FontAwesome
                  name={isGainer ? "arrow-up" : "arrow-down"}
                  size={9}
                  color={deltaColor}
                />
                <Text style={{ fontSize: 11, fontWeight: "700", color: deltaColor }}>
                  {formatPct(card.trend7dPct)}
                </Text>
              </View>
              <Text style={{ fontSize: 10, color: palette.textInverseMuted }}>
                {`${card.numSales} sales \u00b7 7d`}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
