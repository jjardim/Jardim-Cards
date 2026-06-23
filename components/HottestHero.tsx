import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { CardImage } from "./CardImage";
import { formatCents, formatPct } from "@/lib/utils";
import { parseGradeParts } from "@/lib/parsing/grade";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";
import { SPORTS, type MarketMover, type Sport } from "@/lib/types";

interface HottestHeroProps {
  hottestBySport: Partial<Record<Sport, MarketMover>>;
  onPress: (card: MarketMover) => void;
}

export function HottestHero({ hottestBySport, onPress }: HottestHeroProps) {
  const [selectedSport, setSelectedSport] = useState<Sport>("baseball");

  const card = hottestBySport[selectedSport];
  const sportTheme = getSportTheme(selectedSport);
  const gradeParts = card ? parseGradeParts(card.grade) : null;
  const hasTrend = card?.trend7dPct !== null;
  const isGainer = hasTrend && (card?.trend7dPct ?? 0) >= 0;
  const deltaColor = !hasTrend
    ? palette.textInverseMuted
    : isGainer
      ? "#4ade80"
      : "#fb7185";
  const deltaBg = !hasTrend
    ? "rgba(255,255,255,0.10)"
    : isGainer
      ? "rgba(74,222,128,0.15)"
      : "rgba(251,113,133,0.15)";

  return (
    <View
      style={{
        backgroundColor: palette.heroDark,
        borderRadius: radius.xl,
        padding: 18,
        marginTop: 18,
        overflow: "hidden",
        ...shadow.md,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: sportTheme.color,
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

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
            {`HOTTEST IN ${sportTheme.label.toUpperCase()}`}
          </Text>
        </View>
        {card && gradeParts && (
          <View
            style={{
              backgroundColor: gradeParts.company ? "rgba(59,130,246,0.22)" : "rgba(255,255,255,0.08)",
              borderRadius: radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: gradeParts.company ? palette.primarySoft : palette.textInverseMuted,
                letterSpacing: 0.3,
              }}
            >
              {gradeParts.company ? `${gradeParts.company} ${gradeParts.score ?? ""}`.trim() : "RAW"}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        style={{ marginTop: 12 }}
        contentContainerStyle={{ gap: 6, paddingRight: 4 }}
      >
        {SPORTS.map((s) => {
          const theme = getSportTheme(s);
          const hasSpotlight = !!hottestBySport[s];
          const active = selectedSport === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setSelectedSport(s)}
              activeOpacity={0.75}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: radius.pill,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: active ? theme.color : "rgba(255,255,255,0.08)",
                borderWidth: active ? 0 : 1,
                borderColor: "rgba(255,255,255,0.12)",
                opacity: active || hasSpotlight ? 1 : 0.72,
                ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
              }}
            >
              <Text style={{ fontSize: 12 }}>{theme.emoji}</Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: active ? "800" : "600",
                  color: active ? palette.textInverse : palette.textInverseMuted,
                  letterSpacing: 0.2,
                }}
              >
                {theme.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {card && gradeParts ? (
        <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(card)} style={{ marginTop: 14 }}>
        <View style={{ flexDirection: "row", gap: 14 }}>
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
                {gradeParts.label.toUpperCase()} AVG
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
                  {hasTrend && (
                    <FontAwesome
                      name={isGainer ? "arrow-up" : "arrow-down"}
                      size={9}
                      color={deltaColor}
                    />
                  )}
                  <Text style={{ fontSize: 11, fontWeight: "700", color: deltaColor }}>
                    {hasTrend ? formatPct(card.trend7dPct) : "\u2014 no 7d data yet"}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: palette.textInverseMuted }}>
                  {`${card.numSales} comps tracked`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      ) : (
        <View
          style={{
            marginTop: 14,
            paddingVertical: 28,
            paddingHorizontal: 16,
            borderRadius: radius.lg,
            backgroundColor: "rgba(255,255,255,0.06)",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 28, marginBottom: 8 }}>{sportTheme.emoji}</Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: palette.textInverse,
              textAlign: "center",
            }}
          >
            No gainers in {sportTheme.label} yet
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: palette.textInverseMuted,
              marginTop: 6,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            Try a wider era or price filter, or check back as we track more sold comps.
          </Text>
        </View>
      )}
    </View>
  );
}
