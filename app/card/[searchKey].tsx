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
import { formatCents, formatPct, trendColor } from "@/lib/utils";
import { getCardDetail, fetchActiveListingsForCard } from "@/lib/api";
import type { SoldListing, ActiveListing } from "@/lib/api";

const TREND_COLORS = { green: "#10b981", red: "#ef4444", gray: "#a1a1aa" };
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
  const { searchKey } = useLocalSearchParams<{ searchKey: string }>();
  const router = useRouter();

  const { data: detail, isLoading } = useQuery({
    queryKey: ["card-detail", searchKey],
    queryFn: () => getCardDetail(searchKey ?? ""),
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fafafa" }}>
        <ActivityIndicator size="large" color="#18181b" />
        <Text style={{ fontSize: 14, color: "#71717a", marginTop: 12 }}>Loading card data...</Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fafafa" }}>
        <Text style={{ fontSize: 16, color: "#71717a" }}>Card not found</Text>
      </View>
    );
  }

  const chartColor = card.trend7dPct >= 0 ? "#10b981" : "#ef4444";
  const minVal = Math.min(...chartData.map((d) => d.value));
  const maxVal = Math.max(...chartData.map((d) => d.value));
  const yOffset = Math.max(0, minVal - (maxVal - minVal) * 0.1);

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

  const visibleSold = soldExpanded ? sortedSold : sortedSold.slice(0, 5);
  const avgSoldPrice = soldListings.length > 0
    ? Math.round(soldListings.reduce((s, l) => s + l.priceCents, 0) / soldListings.length)
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          <CardImage
            imageUrl={card.imageUrl}
            playerName={card.playerName}
            setName={card.setName}
            year={card.year}
            width={100}
            height={140}
            borderRadius={8}
          />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#18181b" }}>
              {card.playerName}
            </Text>
            <Text style={{ fontSize: 14, color: "#71717a", marginTop: 4 }}>
              {card.setName} {card.year ? `(${card.year})` : ""}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#18181b" }}>
                {formatCents(card.avgPriceCents)}
              </Text>
              <TrendBadge pct={card.trend7dPct} />
            </View>
            <Text style={{ fontSize: 13, color: "#a1a1aa", marginTop: 4 }}>
              {card.numSales} sales in the last 7 days
            </Text>
          </View>
        </View>

        {/* Price Chart */}
        <View style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: "#e4e4e7",
          marginBottom: 16,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#18181b" }}>
              Sales History ({chronoSold.length > 0 ? `${chronoSold.length} sales` : "90 days"})
            </Text>
            {chronoSold.length > 0 && (
              <Text style={{ fontSize: 11, color: "#a1a1aa" }}>Tap a dot to view sale</Text>
            )}
          </View>
          {chartData.length > 0 && (
            <LineChart
              data={chartData}
              width={CHART_WIDTH - 50}
              height={180}
              color={chartColor}
              thickness={2}
              curved
              yAxisOffset={yOffset}
              yAxisTextStyle={{ fontSize: 10, color: "#a1a1aa" }}
              yAxisLabelPrefix="$"
              noOfSections={4}
              rulesColor="#f4f4f5"
              rulesType="dashed"
              startFillColor={chartColor}
              endFillColor="transparent"
              startOpacity={0.2}
              endOpacity={0}
              areaChart
              isAnimated
              animationDuration={800}
              dataPointsRadius={chronoSold.length > 0 ? 4 : 0}
              dataPointsColor={chartColor}
              focusEnabled={chronoSold.length > 0}
              showDataPointOnFocus
              showStripOnFocus
              stripColor="#e4e4e7"
              stripWidth={1}
              focusedDataPointRadius={6}
              focusedDataPointColor="#18181b"
              onFocus={(_item: { value: number }, index: number) => {
                if (index >= 0 && index < chronoSold.length) {
                  setFocusedSale(chronoSold[index]);
                }
              }}
            />
          )}

          {/* Focused sale tooltip */}
          {focusedSale && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openUrl(focusedSale.ebayUrl)}
              style={{
                backgroundColor: "#18181b",
                borderRadius: 10,
                padding: 12,
                marginTop: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {focusedSale.imageUrl ? (
                <Image
                  source={{ uri: focusedSale.imageUrl }}
                  style={{ width: 36, height: 36, borderRadius: 6, marginRight: 10, backgroundColor: "#27272a" }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: 36, height: 36, borderRadius: 6, marginRight: 10, backgroundColor: "#27272a", justifyContent: "center", alignItems: "center" }}>
                  <FontAwesome name="shopping-cart" size={12} color="#52525b" />
                </View>
              )}
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 12, color: "#fff", fontWeight: "500" }} numberOfLines={1}>
                  {focusedSale.title}
                </Text>
                <Text style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>
                  Sold {focusedSale.date}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                  {formatCents(focusedSale.priceCents)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: "#60a5fa", fontWeight: "500" }}>View on eBay</Text>
                  <FontAwesome name="external-link" size={8} color="#60a5fa" />
                </View>
              </View>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingLeft: 50 }}>
            <Text style={{ fontSize: 11, color: "#a1a1aa" }}>
              {chronoSold.length > 0 && chronoSold[0] ? chronoSold[0].date : "90 days ago"}
            </Text>
            <Text style={{ fontSize: 11, color: "#a1a1aa" }}>
              {chronoSold.length > 0 && chronoSold[chronoSold.length - 1] ? chronoSold[chronoSold.length - 1].date : "Today"}
            </Text>
          </View>
          {/* Price range summary */}
          {chartData.length > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f4f4f5" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 10, color: "#a1a1aa", fontWeight: "500" }}>Low</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#18181b" }}>${minVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 10, color: "#a1a1aa", fontWeight: "500" }}>High</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#18181b" }}>${maxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 10, color: "#a1a1aa", fontWeight: "500" }}>Current Avg</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: chartColor }}>{formatCents(card.avgPriceCents)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Why It's Trending */}
        <View style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: "#e4e4e7",
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#18181b", marginBottom: 8 }}>
            Why It&apos;s {card.trend7dPct >= 0 ? "Trending" : "Dropping"}
          </Text>
          <Text style={{ fontSize: 14, color: "#3f3f46", lineHeight: 22 }}>
            {trendReason}
          </Text>
          {card.trend30dPct !== null && (
            <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
              <View>
                <Text style={{ fontSize: 11, color: "#a1a1aa" }}>7-day</Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: TREND_COLORS[trendColor(card.trend7dPct)] }}>
                  {formatPct(card.trend7dPct)}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: "#a1a1aa" }}>30-day</Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: TREND_COLORS[trendColor(card.trend30dPct)] }}>
                  {formatPct(card.trend30dPct)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Buy Signal */}
        {buySignal && (
          <View style={{
            backgroundColor: "#f0fdf4",
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: "#bbf7d0",
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>💰</Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#166534" }}>
                Buy Signal
              </Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#15803d", marginBottom: 6 }}>
              {formatCents(buySignal.priceCents)}
            </Text>
            <Text style={{ fontSize: 13, color: "#166534", lineHeight: 20 }}>
              {buySignal.label}
            </Text>
            <Text style={{ fontSize: 11, color: "#4ade80", marginTop: 8 }}>
              Based on avg price with market momentum discount
            </Text>
          </View>
        )}

        {/* eBay Listings Section */}
        <View style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#e4e4e7",
          marginBottom: 16,
          overflow: "hidden",
        }}>
          <View style={{ padding: 16, paddingBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#18181b", marginBottom: 12 }}>
              eBay Listings
            </Text>

            {/* Segment control */}
            <View style={{
              flexDirection: "row",
              backgroundColor: "#f4f4f5",
              borderRadius: 10,
              padding: 3,
            }}>
              <TouchableOpacity
                onPress={() => handleTabSwitch("sold")}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: salesTab === "sold" ? "#fff" : "transparent",
                  alignItems: "center",
                  ...(salesTab === "sold"
                    ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
                    : {}),
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: salesTab === "sold" ? "700" : "500",
                  color: salesTab === "sold" ? "#18181b" : "#71717a",
                }}>
                  Recent Sales
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTabSwitch("active")}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: salesTab === "active" ? "#fff" : "transparent",
                  alignItems: "center",
                  ...(salesTab === "active"
                    ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
                    : {}),
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: salesTab === "active" ? "700" : "500",
                  color: salesTab === "active" ? "#18181b" : "#71717a",
                }}>
                  Active Listings
                </Text>
              </TouchableOpacity>
            </View>

            {/* Summary bar */}
            {salesTab === "sold" && avgSoldPrice !== null && (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 10,
                backgroundColor: "#f0fdf4",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}>
                <FontAwesome name="line-chart" size={12} color="#16a34a" />
                <Text style={{ fontSize: 13, color: "#15803d", fontWeight: "600" }}>
                  Avg sold: {formatCents(avgSoldPrice)}
                </Text>
                <Text style={{ fontSize: 12, color: "#71717a" }}>
                  ({soldListings.length} sale{soldListings.length !== 1 ? "s" : ""})
                </Text>
              </View>
            )}
            {salesTab === "active" && !loadingActive && activeListings.length > 0 && (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 10,
                backgroundColor: "#eff6ff",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}>
                <FontAwesome name="tag" size={12} color="#2563eb" />
                <Text style={{ fontSize: 13, color: "#1d4ed8", fontWeight: "600" }}>
                  {activeListings.length} active
                </Text>
                <Text style={{ fontSize: 12, color: "#71717a" }}>
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
                  <View style={{ alignItems: "center", paddingVertical: 24 }}>
                    <FontAwesome name="search" size={20} color="#d4d4d8" />
                    <Text style={{ color: "#a1a1aa", marginTop: 8, fontSize: 13 }}>No sold listings found</Text>
                  </View>
                ) : (
                  <>
                    {visibleSold.map((listing, idx) => (
                      <ListingRow key={`sold-${idx}`} listing={listing} type="sold" isLast={idx === visibleSold.length - 1} />
                    ))}
                    {soldListings.length > 5 && (
                      <TouchableOpacity
                        onPress={() => setSoldExpanded(!soldExpanded)}
                        style={{ alignItems: "center", paddingVertical: 12 }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#3b82f6" }}>
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
                  <View style={{ alignItems: "center", paddingVertical: 24 }}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={{ color: "#a1a1aa", marginTop: 8, fontSize: 13 }}>Finding listings...</Text>
                  </View>
                ) : activeListings.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 24 }}>
                    <FontAwesome name="tag" size={20} color="#d4d4d8" />
                    <Text style={{ color: "#a1a1aa", marginTop: 8, fontSize: 13 }}>No active listings found</Text>
                  </View>
                ) : (
                  sortedActive.map((listing, idx) => (
                    <ListingRow key={`active-${idx}`} listing={listing} type="active" isLast={idx === sortedActive.length - 1} />
                  ))
                )}
              </>
            )}
          </View>
        </View>

        {/* Related Cards */}
        {relatedCards.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#18181b", marginBottom: 12 }}>
              Also Trending in {card.sport.charAt(0).toUpperCase() + card.sport.slice(1)}
            </Text>
            {relatedCards.map((related) => (
              <TouchableOpacity
                key={related.searchKey}
                onPress={() => router.push(`/card/${related.searchKey}`)}
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
                <CardImage
                  imageUrl={related.imageUrl}
                  playerName={related.playerName}
                  setName={related.setName}
                  year={related.year}
                  width={48}
                  height={67}
                  borderRadius={5}
                />
                <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#18181b" }}>
                    {related.playerName}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#71717a", marginTop: 2 }}>
                    {related.setName} {related.year ? `(${related.year})` : ""}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#18181b", marginTop: 4 }}>
                    {formatCents(related.avgPriceCents)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <TrendBadge pct={related.trend7dPct} />
                  <Text style={{ fontSize: 11, color: "#a1a1aa" }}>{related.numSales} sales</Text>
                </View>
              </TouchableOpacity>
            ))}
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
        paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#f4f4f5",
      }}
    >
      {listing.imageUrl ? (
        <Image
          source={{ uri: listing.imageUrl }}
          style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: "#f4f4f5", marginRight: 10 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: "#f4f4f5", justifyContent: "center", alignItems: "center", marginRight: 10 }}>
          <FontAwesome name={type === "sold" ? "shopping-cart" : "tag"} size={14} color="#d4d4d8" />
        </View>
      )}
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={{ fontSize: 12, color: "#18181b", fontWeight: "500" }} numberOfLines={2}>
          {listing.title}
        </Text>
        {isSold ? (
          <Text style={{ fontSize: 10, color: "#a1a1aa", marginTop: 2 }}>
            Sold {(listing as SoldListing).date}
          </Text>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
            <View style={{ backgroundColor: "#dbeafe", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
              <Text style={{ fontSize: 9, color: "#2563eb", fontWeight: "600" }}>BUY NOW</Text>
            </View>
          </View>
        )}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#18181b" }}>
          {formatCents(listing.priceCents)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}>
          <Text style={{ fontSize: 10, color: "#3b82f6", fontWeight: "500" }}>eBay</Text>
          <FontAwesome name="external-link" size={8} color="#3b82f6" />
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
    <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
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
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: active ? "#18181b" : "#f4f4f5",
            }}
          >
            <FontAwesome name={opt.icon} size={10} color={active ? "#fff" : "#71717a"} />
            <Text style={{ fontSize: 11, fontWeight: "600", color: active ? "#fff" : "#52525b" }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
