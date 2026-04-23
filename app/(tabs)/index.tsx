import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { StatCard } from "@/components/StatCard";
import { TrendBadge } from "@/components/TrendBadge";
import { CardImage } from "@/components/CardImage";
import { HotCarousel } from "@/components/HotCarousel";
import { PortfolioWidget } from "@/components/PortfolioWidget";
import { RecentSoldFeed } from "@/components/RecentSoldFeed";
import { HottestHero } from "@/components/HottestHero";
import { SportMix } from "@/components/SportMix";
import { formatCents, formatPct } from "@/lib/utils";
import { fetchTrending } from "@/lib/api";
import { SPORTS } from "@/lib/types";
import type { MarketMover } from "@/lib/types";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";

const ERAS = [
  { label: "All", min: undefined, max: undefined },
  { label: "Vintage", min: 1900, max: 1969 },
  { label: "70s", min: 1970, max: 1979 },
  { label: "80s", min: 1980, max: 1989 },
  { label: "90s", min: 1990, max: 1999 },
  { label: "2000s", min: 2000, max: 2009 },
  { label: "2010s", min: 2010, max: 2019 },
  { label: "Modern", min: 2020, max: undefined },
] as const;

const PRICE_TIERS = [
  { label: "All Prices", min: 0, max: Infinity },
  { label: "Budget", sublabel: "$1-25", min: 100, max: 2500 },
  { label: "Mid", sublabel: "$25-100", min: 2500, max: 10000 },
  { label: "Premium", sublabel: "$100+", min: 10000, max: Infinity },
] as const;

type TrendTab = "gainers" | "losers";

function FilterPill({
  label,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  active: boolean;
  activeColor?: string;
  onPress: () => void;
}) {
  const bg = active ? activeColor ?? palette.heroDark : palette.surface;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: bg,
        ...(active ? shadow.sm : {}),
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: active ? "700" : "600",
          color: active ? palette.textInverse : palette.textMuted,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const [sport, setSport] = useState("");
  const [eraIdx, setEraIdx] = useState(0);
  const [tierIdx, setTierIdx] = useState(0);
  const [trendTab, setTrendTab] = useState<TrendTab>("gainers");
  const [searchText, setSearchText] = useState("");

  const era = ERAS[eraIdx];
  const tier = PRICE_TIERS[tierIdx];
  const sportTheme = getSportTheme(sport);

  const { data: trending = [], isLoading } = useQuery<MarketMover[]>({
    queryKey: ["trending", sport, era.min, era.max],
    queryFn: () => fetchTrending(sport || undefined, era.min, era.max),
  });

  const filtered = useMemo(() => {
    let items = trending;
    if (tier.min > 0 || tier.max < Infinity) {
      items = items.filter((c) => c.avgPriceCents >= tier.min && c.avgPriceCents <= tier.max);
    }
    return items;
  }, [trending, tier]);

  const gainers = useMemo(
    () => filtered.filter((c) => c.trend7dPct > 0).sort((a, b) => b.trend7dPct - a.trend7dPct),
    [filtered]
  );
  const losers = useMemo(
    () => filtered.filter((c) => c.trend7dPct < 0).sort((a, b) => a.trend7dPct - b.trend7dPct),
    [filtered]
  );
  const trendList = trendTab === "gainers" ? gainers : losers;

  const topGainer = useMemo(
    () =>
      filtered.reduce<MarketMover | null>(
        (b, c) => (!b || c.trend7dPct > b.trend7dPct ? c : b),
        null
      ),
    [filtered]
  );
  const topDecliner = useMemo(
    () =>
      filtered.reduce<MarketMover | null>(
        (b, c) => (!b || c.trend7dPct < b.trend7dPct ? c : b),
        null
      ),
    [filtered]
  );
  const totalVolume = useMemo(() => filtered.reduce((s, c) => s + c.numSales, 0), [filtered]);
  const avgTrend = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((s, c) => s + c.trend7dPct, 0) / filtered.length;
  }, [filtered]);

  const handleSearch = () => {
    const q = searchText.trim();
    if (q) router.push("/(tabs)/search");
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ padding: 16, paddingBottom: 32 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: palette.textMuted, fontWeight: "500" }}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </Text>
            <Text
              style={{
                fontSize: 30,
                fontWeight: "700",
                color: palette.text,
                letterSpacing: -0.8,
                marginTop: 4,
              }}
            >
              Market Pulse
            </Text>
            <Text style={{ fontSize: 14, color: palette.textMuted, marginTop: 2 }}>
              Where sports cards are moving today
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.7}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.pill,
              backgroundColor: palette.surface,
              alignItems: "center",
              justifyContent: "center",
              ...shadow.sm,
            }}
          >
            <FontAwesome name="user" size={18} color={palette.text} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: palette.surface,
            borderRadius: radius.pill,
            marginTop: 16,
            paddingHorizontal: 16,
            ...shadow.sm,
          }}
        >
          <FontAwesome name="search" size={14} color={palette.textSubtle} />
          <TextInput
            placeholder="Search players, sets, years..."
            placeholderTextColor={palette.textSubtle}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 10,
              fontSize: 14,
              color: palette.text,
            }}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name="times-circle" size={16} color={palette.textSubtle} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sport filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[{ label: "All", value: "", emoji: "\uD83C\uDFAF" }, ...SPORTS.map((s) => {
              const t = getSportTheme(s);
              return { label: t.label, value: s, emoji: t.emoji };
            })].map((item) => {
              const active = sport === item.value;
              const t = getSportTheme(item.value);
              return (
                <TouchableOpacity
                  key={item.value || "all"}
                  onPress={() => setSport(item.value)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: radius.pill,
                    backgroundColor: active ? t.color : palette.surface,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    ...(active ? shadow.sm : {}),
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{item.emoji}</Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: active ? "700" : "600",
                      color: active ? palette.textInverse : palette.textMuted,
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Era pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {ERAS.map((e, i) => (
              <FilterPill
                key={e.label}
                label={e.label}
                active={eraIdx === i}
                onPress={() => setEraIdx(i)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Price tier pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {PRICE_TIERS.map((t, i) => (
              <FilterPill
                key={t.label}
                label={`${t.label}${"sublabel" in t ? ` ${t.sublabel}` : ""}`}
                active={tierIdx === i}
                activeColor={palette.purple}
                onPress={() => setTierIdx(i)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Hottest Card dark hero */}
        {topGainer && (
          <HottestHero
            card={topGainer}
            onPress={() => router.push(`/card/${topGainer.searchKey}`)}
          />
        )}

        {/* Portfolio widget */}
        <PortfolioWidget />

        {/* Loading */}
        {isLoading && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={{ fontSize: 13, color: palette.textMuted, marginTop: 10 }}>
              Loading {sportTheme.label.toLowerCase()} cards...
            </Text>
          </View>
        )}

        {/* Big-number stats strip */}
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
                trend={avgTrend}
                subtitle={`${totalVolume.toLocaleString()} sales (7d)`}
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
                onPress={() => router.push(`/card/${topDecliner.searchKey}`)}
              />
            </View>
          )}
        </View>

        {/* Sport allocation */}
        <SportMix cards={filtered} />

        {/* Hot Right Now carousel */}
        <HotCarousel cards={filtered} />

        {/* Gainers / Losers */}
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
              <Text style={{ fontSize: 20 }}>
                {trendTab === "gainers" ? "\uD83D\uDE80" : "\uD83D\uDCC9"}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: palette.text, letterSpacing: -0.3 }}
              >
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
                key={card.searchKey}
                activeOpacity={0.7}
                onPress={() => router.push(`/card/${card.searchKey}`)}
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
                  <Text style={{ fontSize: 11, fontWeight: "800", color: theme.color }}>
                    {i + 1}
                  </Text>
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
                  <Text
                    style={{ fontSize: 12, color: palette.textMuted, marginTop: 2 }}
                    numberOfLines={1}
                  >
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
                  <Text style={{ fontSize: 10, color: palette.textSubtle }}>
                    {card.numSales} sales
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recently sold feed */}
        <RecentSoldFeed sport={sport || undefined} yearMin={era.min} yearMax={era.max} />

        <Text
          style={{
            textAlign: "center",
            fontSize: 11,
            color: palette.textSubtle,
            marginTop: 20,
            marginBottom: 32,
          }}
        >
          Prices from eBay sold listings
        </Text>
      </View>
    </ScrollView>
  );
}
