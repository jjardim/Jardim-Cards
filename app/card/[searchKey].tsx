import { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LineChart } from "react-native-gifted-charts";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { TrendBadge } from "@/components/TrendBadge";
import { CardImage } from "@/components/CardImage";
import { formatCents, formatPct } from "@/lib/utils";
import { getCardDetail, fetchActiveListingsForCard } from "@/lib/api";
import type { SoldListing, ActiveListing } from "@/lib/api";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";

const CHART_WIDTH = Dimensions.get("window").width - 64;

type SalesTab = "sold" | "active";
type SortOrder = "newest" | "low" | "high";

function openUrl(url: string) {
  if (Platform.OS === "web") {
    window.open(url, "_blank");
  } else {
    Linking.openURL(url);
  }
}

export default function CardDetailScreen() {
  const { searchKey, player, set, year, grade, sport, pc } = useLocalSearchParams<{
    searchKey: string;
    player?: string;
    set?: string;
    year?: string;
    grade?: string;
    sport?: string;
    pc?: string;
  }>();
  const router = useRouter();

  const playerStr = typeof player === "string" ? player : undefined;
  const setStr = typeof set === "string" ? set : undefined;
  const yearStr = typeof year === "string" ? year : undefined;
  const gradeStr = typeof grade === "string" ? grade : undefined;
  const sportStr = typeof sport === "string" ? sport : undefined;
  const pricechartingId = typeof pc === "string" ? pc : undefined;

  const { data: detail, isLoading } = useQuery({
    // Grade is part of the cache key because it changes which PC price field
    // drives the headline (PSA 10 vs raw can be orders of magnitude apart).
    queryKey: ["card-detail", searchKey, pricechartingId, gradeStr],
    queryFn: () =>
      getCardDetail(
        searchKey ?? "",
        playerStr
          ? {
              playerName: playerStr,
              setName: setStr ?? null,
              year: yearStr ? parseInt(yearStr) : null,
              grade: gradeStr ?? null,
              sport: sportStr ?? "baseball",
              pricechartingId: pricechartingId ?? null,
            }
          : undefined
      ),
    enabled: !!searchKey,
  });

  const card = detail?.card ?? null;
  const priceHistory = detail?.priceHistory ?? [];
  const relatedCards = detail?.relatedCards ?? [];
  const soldListings = detail?.soldListings ?? [];
  const buySignal = detail?.buySignal ?? null;
  const trendReason = detail?.trendReason ?? "";

  const [salesTab, setSalesTab] = useState<SalesTab>("sold");
  const [activeListings, setActiveListings] = useState<ActiveListing[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [activeFetched, setActiveFetched] = useState(false);
  const [soldExpanded, setSoldExpanded] = useState(false);
  const [soldSort, setSoldSort] = useState<SortOrder>("newest");
  const [activeSort, setActiveSort] = useState<SortOrder>("low");
  const [focusedSale, setFocusedSale] = useState<SoldListing | null>(null);

  useEffect(() => {
    setActiveFetched(false);
    setActiveListings([]);
    setSalesTab("sold");
    setSoldExpanded(false);
    setSoldSort("newest");
    setActiveSort("low");
    setFocusedSale(null);
  }, [searchKey]);

  const loadActiveListings = useCallback(async () => {
    if (activeFetched || !card) return;
    setLoadingActive(true);
    try {
      const results = await fetchActiveListingsForCard({
        player_name: card.playerName,
        set_name: card.setName,
        year: card.year,
      });
      setActiveListings(results);
    } catch {
      setActiveListings([]);
    } finally {
      setLoadingActive(false);
      setActiveFetched(true);
    }
  }, [card, activeFetched]);

  const handleTabSwitch = (tab: SalesTab) => {
    setSalesTab(tab);
    if (tab === "active" && !activeFetched) {
      loadActiveListings();
    }
  };

  const chronoSold = useMemo(
    () => [...soldListings].sort((a, b) => a.date.localeCompare(b.date)),
    [soldListings]
  );

  const chartData = useMemo(() => {
    if (chronoSold.length > 0) {
      return chronoSold.map((s) => ({
        value: s.priceCents / 100,
        label: "",
        dataPointColor: "#10b981",
      }));
    }
    return priceHistory
      .filter((_, i) => i % 3 === 0 || i === priceHistory.length - 1)
      .map((p) => ({ value: p.priceCents / 100, label: "" }));
  }, [chronoSold, priceHistory]);

  const sortedSold = useMemo(() => {
    const items = [...soldListings];
    if (soldSort === "low") return items.sort((a, b) => a.priceCents - b.priceCents);
    if (soldSort === "high") return items.sort((a, b) => b.priceCents - a.priceCents);
    return items;
  }, [soldListings, soldSort]);

  const sortedActive = useMemo(() => {
    const items = [...activeListings];
    if (activeSort === "low") return items.sort((a, b) => a.priceCents - b.priceCents);
    if (activeSort === "high") return items.sort((a, b) => b.priceCents - a.priceCents);
    return items;
  }, [activeListings, activeSort]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: palette.bg }}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ fontSize: 14, color: palette.textMuted, marginTop: 12 }}>
          Loading card data...
        </Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: palette.bg }}>
        <Text style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83D\uDD0D"}</Text>
        <Text style={{ fontSize: 16, color: palette.textMuted }}>Card not found</Text>
      </View>
    );
  }

  const sportTheme = getSportTheme(card.sport);
  const chartColor = card.trend7dPct >= 0 ? palette.success : palette.danger;
  const minVal = Math.min(...chartData.map((d) => d.value));
  const maxVal = Math.max(...chartData.map((d) => d.value));
  const yOffset = Math.max(0, minVal - (maxVal - minVal) * 0.1);

  const visibleSold = soldExpanded ? sortedSold : sortedSold.slice(0, 5);
  const avgSoldPrice = soldListings.length > 0
    ? Math.round(soldListings.reduce((s, l) => s + l.priceCents, 0) / soldListings.length)
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ padding: 16 }}>
        {/* Back pill */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: palette.surface,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: radius.pill,
            marginBottom: 14,
            ...shadow.sm,
          }}
        >
          <FontAwesome name="chevron-left" size={10} color={palette.text} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: palette.text }}>Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          <View style={shadow.md}>
            <CardImage
              imageUrl={card.imageUrl}
              playerName={card.playerName}
              setName={card.setName}
              year={card.year}
              width={110}
              height={154}
              borderRadius={10}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 16, justifyContent: "space-between" }}>
            <View>
              <View
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: sportTheme.bg,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                }}
              >
                <Text style={{ fontSize: 11 }}>{sportTheme.emoji}</Text>
                <Text
                  style={{ fontSize: 10, color: sportTheme.color, fontWeight: "700", letterSpacing: 0.3 }}
                >
                  {sportTheme.label.toUpperCase()}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: palette.text,
                  letterSpacing: -0.5,
                  marginTop: 8,
                }}
              >
                {card.playerName}
              </Text>
              <Text style={{ fontSize: 13, color: palette.textMuted, marginTop: 2 }} numberOfLines={2}>
                {card.setName} {card.year ? `(${card.year})` : ""}
              </Text>
            </View>
            <View>
              <Text
                style={{ fontSize: 10, color: palette.textSubtle, fontWeight: "700", letterSpacing: 0.4 }}
              >
                AVG PRICE
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                <Text
                  style={{ fontSize: 26, fontWeight: "700", color: palette.text, letterSpacing: -0.6 }}
                >
                  {formatCents(card.avgPriceCents)}
                </Text>
                <TrendBadge pct={card.trend7dPct} size="md" />
              </View>
              <Text style={{ fontSize: 11, color: palette.textSubtle, marginTop: 2 }}>
                {card.numSales} sales in the last 7 days
              </Text>
            </View>
          </View>
        </View>

        {/* Price Chart */}
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            padding: 16,
            marginBottom: 16,
            ...shadow.sm,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 18 }}>{"\uD83D\uDCC8"}</Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: palette.text, letterSpacing: -0.2 }}
              >
                Sales History
              </Text>
              <View
                style={{
                  backgroundColor: palette.bgMuted,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: radius.pill,
                }}
              >
                <Text style={{ fontSize: 10, color: palette.textMuted, fontWeight: "700" }}>
                  {chronoSold.length > 0 ? `${chronoSold.length} sales` : "90 days"}
                </Text>
              </View>
            </View>
            {chronoSold.length > 0 && (
              <Text style={{ fontSize: 10, color: palette.textSubtle }}>Tap a dot</Text>
            )}
          </View>
          {chartData.length > 0 && (
            <LineChart
              data={chartData}
              width={CHART_WIDTH - 50}
              height={180}
              color={chartColor}
              thickness={3}
              curved
              yAxisOffset={yOffset}
              yAxisTextStyle={{ fontSize: 10, color: palette.textSubtle }}
              yAxisLabelPrefix="$"
              yAxisColor="transparent"
              xAxisColor="transparent"
              noOfSections={4}
              rulesColor={palette.borderSoft}
              rulesType="dashed"
              startFillColor={chartColor}
              endFillColor={palette.surface}
              startOpacity={0.25}
              endOpacity={0}
              areaChart
              isAnimated
              animationDuration={800}
              dataPointsRadius={chronoSold.length > 0 ? 4 : 0}
              dataPointsColor={chartColor}
              focusEnabled={chronoSold.length > 0}
              showDataPointOnFocus
              showStripOnFocus
              stripColor={palette.borderSoft}
              stripWidth={1}
              focusedDataPointRadius={7}
              focusedDataPointColor={palette.heroDark}
              onFocus={(_item: { value: number }, index: number) => {
                if (index >= 0 && index < chronoSold.length) {
                  setFocusedSale(chronoSold[index]);
                }
              }}
            />
          )}

          {/* Focused sale tooltip (dark AI-insight-style) */}
          {focusedSale && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openUrl(focusedSale.ebayUrl)}
              style={{
                backgroundColor: palette.heroDark,
                borderRadius: radius.md,
                padding: 12,
                marginTop: 10,
                flexDirection: "row",
                alignItems: "center",
                ...shadow.md,
              }}
            >
              {focusedSale.imageUrl ? (
                <Image
                  source={{ uri: focusedSale.imageUrl }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    marginRight: 10,
                    backgroundColor: palette.heroDarkAlt,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    marginRight: 10,
                    backgroundColor: palette.heroDarkAlt,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <FontAwesome name="shopping-cart" size={12} color={palette.textInverseMuted} />
                </View>
              )}
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                  style={{ fontSize: 12, color: palette.textInverse, fontWeight: "600" }}
                  numberOfLines={1}
                >
                  {focusedSale.title}
                </Text>
                <Text
                  style={{ fontSize: 11, color: palette.textInverseMuted, marginTop: 2 }}
                >
                  Sold {focusedSale.date}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: palette.textInverse }}>
                  {formatCents(focusedSale.priceCents)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: palette.primarySoft, fontWeight: "700" }}>
                    View on eBay
                  </Text>
                  <FontAwesome name="external-link" size={8} color={palette.primarySoft} />
                </View>
              </View>
            </TouchableOpacity>
          )}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 8,
              paddingLeft: 50,
            }}
          >
            <Text style={{ fontSize: 11, color: palette.textSubtle }}>
              {chronoSold.length > 0 && chronoSold[0] ? chronoSold[0].date : "90 days ago"}
            </Text>
            <Text style={{ fontSize: 11, color: palette.textSubtle }}>
              {chronoSold.length > 0 && chronoSold[chronoSold.length - 1]
                ? chronoSold[chronoSold.length - 1].date
                : "Today"}
            </Text>
          </View>
          {/* Price range summary */}
          {chartData.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: palette.borderSoft,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{ fontSize: 10, color: palette.textSubtle, fontWeight: "700", letterSpacing: 0.3 }}
                >
                  LOW
                </Text>
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: palette.text, marginTop: 2 }}
                >
                  ${minVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{ fontSize: 10, color: palette.textSubtle, fontWeight: "700", letterSpacing: 0.3 }}
                >
                  HIGH
                </Text>
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: palette.text, marginTop: 2 }}
                >
                  ${maxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{ fontSize: 10, color: palette.textSubtle, fontWeight: "700", letterSpacing: 0.3 }}
                >
                  AVG
                </Text>
                <Text
                  style={{ fontSize: 14, fontWeight: "700", color: chartColor, marginTop: 2 }}
                >
                  {formatCents(card.avgPriceCents)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* AI Insight (dark hero tooltip-style) */}
        <View
          style={{
            backgroundColor: palette.heroDark,
            borderRadius: radius.xl,
            padding: 18,
            marginBottom: 16,
            overflow: "hidden",
            ...shadow.md,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: card.trend7dPct >= 0 ? palette.success : palette.danger,
              opacity: 0.18,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radius.pill,
                backgroundColor: "rgba(96,165,250,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome name="lightbulb-o" size={13} color={palette.primarySoft} />
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: palette.textInverseMuted,
                letterSpacing: 0.5,
              }}
            >
              AI INSIGHT
            </Text>
            <View
              style={{
                marginLeft: "auto",
                backgroundColor: card.trend7dPct >= 0 ? "rgba(74,222,128,0.15)" : "rgba(251,113,133,0.15)",
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: radius.pill,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "800",
                  color: card.trend7dPct >= 0 ? "#4ade80" : "#fb7185",
                  letterSpacing: 0.3,
                }}
              >
                {card.trend7dPct >= 0 ? "TRENDING UP" : "TRENDING DOWN"}
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: palette.textInverse,
              letterSpacing: -0.4,
              marginTop: 14,
            }}
          >
            Why it&apos;s {card.trend7dPct >= 0 ? "moving up" : "cooling off"}
          </Text>
          <Text
            style={{ fontSize: 13, color: palette.textInverseMuted, lineHeight: 20, marginTop: 6 }}
          >
            {trendReason}
          </Text>
          {card.trend30dPct !== null && (
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 14,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.08)",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 10, color: palette.textInverseMuted, fontWeight: "700", letterSpacing: 0.3 }}
                >
                  7-DAY
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: card.trend7dPct >= 0 ? "#4ade80" : "#fb7185",
                    letterSpacing: -0.3,
                    marginTop: 2,
                  }}
                >
                  {formatPct(card.trend7dPct)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 10, color: palette.textInverseMuted, fontWeight: "700", letterSpacing: 0.3 }}
                >
                  30-DAY
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: card.trend30dPct >= 0 ? "#4ade80" : "#fb7185",
                    letterSpacing: -0.3,
                    marginTop: 2,
                  }}
                >
                  {formatPct(card.trend30dPct)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 10, color: palette.textInverseMuted, fontWeight: "700", letterSpacing: 0.3 }}
                >
                  SALES
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: palette.textInverse,
                    letterSpacing: -0.3,
                    marginTop: 2,
                  }}
                >
                  {card.numSales}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Buy Signal */}
        {buySignal && (
          <View
            style={{
              backgroundColor: palette.successBg,
              borderRadius: radius.lg,
              padding: 16,
              marginBottom: 16,
              ...shadow.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.pill,
                  backgroundColor: palette.success,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 14 }}>{"\uD83D\uDCB0"}</Text>
              </View>
              <Text
                style={{ fontSize: 11, fontWeight: "800", color: "#166534", letterSpacing: 0.5 }}
              >
                BUY SIGNAL
              </Text>
              <View
                style={{
                  marginLeft: "auto",
                  backgroundColor: palette.success,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "800", color: palette.textInverse, letterSpacing: 0.3 }}>
                  GREAT DEAL
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 30,
                fontWeight: "700",
                color: "#15803d",
                marginTop: 12,
                letterSpacing: -0.6,
              }}
            >
              {formatCents(buySignal.priceCents)}
            </Text>
            <Text style={{ fontSize: 13, color: "#166534", lineHeight: 20, marginTop: 4 }}>
              {buySignal.label}
            </Text>
            <Text style={{ fontSize: 11, color: "#16a34a", marginTop: 8, fontStyle: "italic" }}>
              Based on avg price with market momentum discount
            </Text>
          </View>
        )}

        {/* eBay Listings Section */}
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            marginBottom: 16,
            overflow: "hidden",
            ...shadow.sm,
          }}
        >
          <View style={{ padding: 16, paddingBottom: 12 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}
            >
              <Text style={{ fontSize: 18 }}>{"\uD83D\uDECD"}</Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: palette.text, letterSpacing: -0.2 }}
              >
                eBay Listings
              </Text>
            </View>

            {/* Segment control (pill-style) */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: palette.bgMuted,
                borderRadius: radius.pill,
                padding: 3,
              }}
            >
              <TouchableOpacity
                onPress={() => handleTabSwitch("sold")}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: radius.pill,
                  backgroundColor: salesTab === "sold" ? palette.surface : "transparent",
                  alignItems: "center",
                  ...(salesTab === "sold" ? shadow.sm : {}),
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: salesTab === "sold" ? palette.text : palette.textMuted,
                  }}
                >
                  Recent Sales
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTabSwitch("active")}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  borderRadius: radius.pill,
                  backgroundColor: salesTab === "active" ? palette.surface : "transparent",
                  alignItems: "center",
                  ...(salesTab === "active" ? shadow.sm : {}),
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: salesTab === "active" ? palette.text : palette.textMuted,
                  }}
                >
                  Active Listings
                </Text>
              </TouchableOpacity>
            </View>

            {/* Summary bar */}
            {salesTab === "sold" && avgSoldPrice !== null && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                  backgroundColor: palette.successBg,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                }}
              >
                <FontAwesome name="line-chart" size={11} color="#16a34a" />
                <Text style={{ fontSize: 12, color: "#15803d", fontWeight: "700" }}>
                  Avg sold: {formatCents(avgSoldPrice)}
                </Text>
                <Text style={{ fontSize: 11, color: palette.textMuted }}>
                  {`\u00B7 ${soldListings.length} sale${soldListings.length !== 1 ? "s" : ""}`}
                </Text>
              </View>
            )}
            {salesTab === "active" && !loadingActive && activeListings.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                  backgroundColor: palette.primaryBg,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                }}
              >
                <FontAwesome name="tag" size={11} color={palette.primary} />
                <Text style={{ fontSize: 12, color: palette.primary, fontWeight: "700" }}>
                  {activeListings.length} active
                </Text>
                <Text style={{ fontSize: 11, color: palette.textMuted }}>
                  from {formatCents(Math.min(...activeListings.map((l) => l.priceCents)))}
                </Text>
              </View>
            )}

            {/* Sort controls */}
            {((salesTab === "sold" && soldListings.length > 1) ||
              (salesTab === "active" && !loadingActive && activeListings.length > 1)) && (
              <SortPills
                value={salesTab === "sold" ? soldSort : activeSort}
                onChange={salesTab === "sold" ? setSoldSort : setActiveSort}
                showNewest={salesTab === "sold"}
              />
            )}
          </View>

          {/* Listings */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {salesTab === "sold" ? (
              <>
                {soldListings.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 28 }}>
                    <FontAwesome name="search" size={22} color={palette.borderSoft} />
                    <Text style={{ color: palette.textSubtle, marginTop: 8, fontSize: 13 }}>
                      No sold listings found
                    </Text>
                  </View>
                ) : (
                  <>
                    {visibleSold.map((listing, idx) => (
                      <ListingRow
                        key={`sold-${idx}`}
                        listing={listing}
                        type="sold"
                        isLast={idx === visibleSold.length - 1}
                      />
                    ))}
                    {soldListings.length > 5 && (
                      <TouchableOpacity
                        onPress={() => setSoldExpanded(!soldExpanded)}
                        activeOpacity={0.7}
                        style={{
                          alignSelf: "center",
                          marginVertical: 10,
                          backgroundColor: palette.primaryBg,
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: radius.pill,
                        }}
                      >
                        <Text
                          style={{ fontSize: 12, fontWeight: "700", color: palette.primary }}
                        >
                          {soldExpanded ? "Show less" : `Show all ${soldListings.length} sales`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {loadingActive ? (
                  <View style={{ alignItems: "center", paddingVertical: 28 }}>
                    <ActivityIndicator size="small" color={palette.primary} />
                    <Text style={{ color: palette.textSubtle, marginTop: 8, fontSize: 13 }}>
                      Finding listings...
                    </Text>
                  </View>
                ) : activeListings.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 28 }}>
                    <FontAwesome name="tag" size={22} color={palette.borderSoft} />
                    <Text style={{ color: palette.textSubtle, marginTop: 8, fontSize: 13 }}>
                      No active listings found
                    </Text>
                  </View>
                ) : (
                  sortedActive.map((listing, idx) => (
                    <ListingRow
                      key={`active-${idx}`}
                      listing={listing}
                      type="active"
                      isLast={idx === sortedActive.length - 1}
                    />
                  ))
                )}
              </>
            )}
          </View>
        </View>

        {/* Related Cards */}
        {relatedCards.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Text style={{ fontSize: 18 }}>{sportTheme.emoji}</Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: palette.text, letterSpacing: -0.2 }}
              >
                Also Trending in {sportTheme.label}
              </Text>
            </View>
            {relatedCards.map((related) => {
              const relTheme = getSportTheme(related.sport);
              return (
                <TouchableOpacity
                  key={related.searchKey}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/card/${related.searchKey}`)}
                  style={{
                    backgroundColor: palette.surface,
                    borderRadius: radius.lg,
                    padding: 12,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    overflow: "hidden",
                    ...shadow.sm,
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      backgroundColor: relTheme.color,
                    }}
                  />
                  <CardImage
                    imageUrl={related.imageUrl}
                    playerName={related.playerName}
                    setName={related.setName}
                    year={related.year}
                    width={48}
                    height={67}
                    borderRadius={6}
                  />
                  <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: palette.text }}>
                      {related.playerName}
                    </Text>
                    <Text style={{ fontSize: 12, color: palette.textMuted, marginTop: 2 }}>
                      {related.setName} {related.year ? `(${related.year})` : ""}
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
                      {formatCents(related.avgPriceCents)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <TrendBadge pct={related.trend7dPct} />
                    <Text style={{ fontSize: 10, color: palette.textSubtle }}>
                      {related.numSales} sales
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ListingRow({
  listing,
  type,
  isLast,
}: {
  listing: SoldListing | ActiveListing;
  type: "sold" | "active";
  isLast: boolean;
}) {
  const isSold = type === "sold" && "date" in listing;

  return (
    <TouchableOpacity
      onPress={() => openUrl(listing.ebayUrl)}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 11,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: palette.borderSoft,
      }}
    >
      {listing.imageUrl ? (
        <Image
          source={{ uri: listing.imageUrl }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            backgroundColor: palette.bgMuted,
            marginRight: 12,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            backgroundColor: palette.bgMuted,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <FontAwesome
            name={type === "sold" ? "shopping-cart" : "tag"}
            size={14}
            color={palette.textSubtle}
          />
        </View>
      )}
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text
          style={{ fontSize: 12, color: palette.text, fontWeight: "600" }}
          numberOfLines={2}
        >
          {listing.title}
        </Text>
        {isSold ? (
          <Text style={{ fontSize: 10, color: palette.textSubtle, marginTop: 3 }}>
            Sold {(listing as SoldListing).date}
          </Text>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <View
              style={{
                backgroundColor: palette.primaryBg,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: radius.pill,
              }}
            >
              <Text style={{ fontSize: 9, color: palette.primary, fontWeight: "800", letterSpacing: 0.3 }}>
                BUY NOW
              </Text>
            </View>
          </View>
        )}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{ fontSize: 14, fontWeight: "700", color: palette.text, letterSpacing: -0.2 }}
        >
          {formatCents(listing.priceCents)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}>
          <Text style={{ fontSize: 10, color: palette.primary, fontWeight: "700" }}>eBay</Text>
          <FontAwesome name="external-link" size={8} color={palette.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SortPills({
  value,
  onChange,
  showNewest,
}: {
  value: SortOrder;
  onChange: (v: SortOrder) => void;
  showNewest: boolean;
}) {
  const options: { key: SortOrder; label: string; icon: "clock-o" | "sort-amount-asc" | "sort-amount-desc" }[] = [
    ...(showNewest ? [{ key: "newest" as SortOrder, label: "Newest", icon: "clock-o" as const }] : []),
    { key: "low", label: "Price: Low", icon: "sort-amount-asc" },
    { key: "high", label: "Price: High", icon: "sort-amount-desc" },
  ];

  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: active ? palette.heroDark : palette.bgMuted,
            }}
          >
            <FontAwesome
              name={opt.icon}
              size={10}
              color={active ? palette.textInverse : palette.textMuted}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: active ? palette.textInverse : palette.textMuted,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
