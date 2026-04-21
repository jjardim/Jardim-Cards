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
import { formatCents, formatPct, trendColor } from "@/lib/utils";
import { fetchTrending } from "@/lib/api";
import { SPORTS } from "@/lib/types";
import type { MarketMover } from "@/lib/types";

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

export default function DashboardScreen() {
  const router = useRouter();
  const [sport, setSport] = useState("");
  const [eraIdx, setEraIdx] = useState(0);
  const [tierIdx, setTierIdx] = useState(0);
  const [trendTab, setTrendTab] = useState<TrendTab>("gainers");
  const [searchText, setSearchText] = useState("");

  const era = ERAS[eraIdx];
  const tier = PRICE_TIERS[tierIdx];

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
    () => filtered.reduce<MarketMover | null>((b, c) => (!b || c.trend7dPct > b.trend7dPct ? c : b), null),
    [filtered]
  );
  const topDecliner = useMemo(
    () => filtered.reduce<MarketMover | null>((b, c) => (!b || c.trend7dPct < b.trend7dPct ? c : b), null),
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
    <ScrollView style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#18181b" }}>Market Dashboard</Text>
        <Text style={{ fontSize: 15, color: "#71717a", marginTop: 4 }}>
          Top trending sports cards and price movements
        </Text>

        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#fff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#e4e4e7",
            marginTop: 16,
            paddingHorizontal: 12,
          }}
        >
          <FontAwesome name="search" size={14} color="#a1a1aa" />
          <TextInput
            placeholder="Search players, sets, years..."
            placeholderTextColor="#a1a1aa"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 10,
              fontSize: 14,
              color: "#18181b",
            }}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome name="times-circle" size={16} color="#d4d4d8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sport filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[{ label: "All", value: "" }, ...SPORTS.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))].map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => setSport(item.value)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: sport === item.value ? "#18181b" : "#fff",
                  borderWidth: 1,
                  borderColor: sport === item.value ? "#18181b" : "#e4e4e7",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: sport === item.value ? "#fff" : "#3f3f46" }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Era pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {ERAS.map((e, i) => {
              const active = eraIdx === i;
              return (
                <TouchableOpacity
                  key={e.label}
                  onPress={() => setEraIdx(i)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                    backgroundColor: active ? "#18181b" : "#fff",
                    borderWidth: 1,
                    borderColor: active ? "#18181b" : "#e4e4e7",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#fff" : "#52525b" }}>
                    {e.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Price tier pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {PRICE_TIERS.map((t, i) => {
              const active = tierIdx === i;
              return (
                <TouchableOpacity
                  key={t.label}
                  onPress={() => setTierIdx(i)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                    backgroundColor: active ? "#7c3aed" : "#fff",
                    borderWidth: 1,
                    borderColor: active ? "#7c3aed" : "#e4e4e7",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#fff" : "#52525b" }}>
                    {t.label}{"sublabel" in t ? ` ${t.sublabel}` : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Portfolio widget */}
        <PortfolioWidget />

        {/* Loading / empty state */}
        {isLoading && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#18181b" />
            <Text style={{ fontSize: 13, color: "#71717a", marginTop: 10 }}>
              Loading {sport ? sport : "trending"} cards...
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <StatCard
              label="Tracked Cards"
              value={filtered.length.toString()}
              subtitle="Cards with recent sales"
            />
          </View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <StatCard
              label="Hottest Card"
              value={topGainer?.playerName ?? "\u2014"}
              trend={topGainer?.trend7dPct}
              subtitle={topGainer?.setName ?? undefined}
              onPress={topGainer ? () => router.push(`/card/${topGainer.searchKey}`) : undefined}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <StatCard
              label="Biggest Drop"
              value={topDecliner?.playerName ?? "\u2014"}
              trend={topDecliner?.trend7dPct}
              subtitle={topDecliner?.setName ?? undefined}
              onPress={topDecliner ? () => router.push(`/card/${topDecliner.searchKey}`) : undefined}
            />
          </View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <StatCard
              label="Avg Movement"
              value={avgTrend !== null ? formatPct(avgTrend) : "\u2014"}
              trend={avgTrend}
              subtitle={`${totalVolume.toLocaleString()} sales (7d)`}
            />
          </View>
        </View>

        {/* Hot Right Now carousel */}
        <HotCarousel cards={filtered} />

        {/* Gainers / Losers */}
        <View style={{ marginTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181b" }}>
              {trendTab === "gainers" ? "Top Gainers" : "Top Losers"}
            </Text>
            <View style={{ flexDirection: "row", backgroundColor: "#f4f4f5", borderRadius: 8, padding: 2 }}>
              <TouchableOpacity
                onPress={() => setTrendTab("gainers")}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: trendTab === "gainers" ? "#fff" : "transparent",
                  ...(trendTab === "gainers"
                    ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 }
                    : {}),
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: trendTab === "gainers" ? "700" : "500", color: trendTab === "gainers" ? "#22c55e" : "#71717a" }}>
                  Gainers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTrendTab("losers")}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: trendTab === "losers" ? "#fff" : "transparent",
                  ...(trendTab === "losers"
                    ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 }
                    : {}),
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: trendTab === "losers" ? "700" : "500", color: trendTab === "losers" ? "#ef4444" : "#71717a" }}>
                  Losers
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {trendList.length === 0 && !isLoading && (
            <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#f4f4f5" }}>
              <Text style={{ fontSize: 13, color: "#a1a1aa" }}>
                No {trendTab === "gainers" ? "gainers" : "losers"} found for this filter
              </Text>
            </View>
          )}

          {trendList.map((card, i) => (
            <TouchableOpacity
              key={card.searchKey}
              activeOpacity={0.7}
              onPress={() => router.push(`/card/${card.searchKey}`)}
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: "#e4e4e7",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#d4d4d8",
                  width: 28,
                  textAlign: "center",
                }}
              >
                #{i + 1}
              </Text>
              <CardImage
                imageUrl={card.imageUrl}
                playerName={card.playerName}
                setName={card.setName}
                year={card.year}
                width={48}
                height={67}
              />
              <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#18181b" }}>{card.playerName}</Text>
                <Text style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
                  {card.setName} {card.year ? `(${card.year})` : ""}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#18181b", marginTop: 3 }}>
                  {formatCents(card.avgPriceCents)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <TrendBadge pct={card.trend7dPct} />
                <Text style={{ fontSize: 11, color: "#a1a1aa" }}>{card.numSales} sales</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recently sold feed */}
        <RecentSoldFeed sport={sport || undefined} yearMin={era.min} yearMax={era.max} />

        <Text style={{ textAlign: "center", fontSize: 11, color: "#a1a1aa", marginTop: 16, marginBottom: 32 }}>
          Prices from eBay sold listings
        </Text>
      </View>
    </ScrollView>
  );
}
