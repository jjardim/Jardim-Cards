import { useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
  ActivityIndicator,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { MiniSparkline } from "@/components/MiniSparkline";
import { CardImage } from "@/components/CardImage";
import { EditCardModal } from "@/components/EditCardModal";
import { SalesModal } from "@/components/SalesModal";
import { formatCents, formatPct, trendColor } from "@/lib/utils";
import { fetchPortfolioValuation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import type { PortfolioCard } from "@/lib/types";
import type { PortfolioValuation, SoldListing, ActiveListing } from "@/lib/api";

const TREND_COLORS = { green: "#22c55e", red: "#ef4444", gray: "#a1a1aa" } as const;

function PortfolioCardRow({
  card,
  onDelete,
  onPress,
  valuation,
  valuationLoading,
  onSalesTap,
}: {
  card: PortfolioCard;
  onDelete: (id: string, name: string) => void;
  onPress: (card: PortfolioCard) => void;
  valuation: PortfolioValuation | null | undefined;
  valuationLoading: boolean;
  onSalesTap: (listings: SoldListing[], cardName: string, avgCents: number | null, cardImageUrl: string | null, cardInfo: { player_name: string; set_name?: string | null; year?: number | null; card_number?: string | null; grade?: string | null }) => void;
}) {
  const height = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const animateAndDelete = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 400,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => {
      Animated.timing(height, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        onDelete(card.id, card.player_name);
      });
    });
  }, [card.id, card.player_name, height, opacity, translateX, onDelete]);

  const handleRemove = useCallback(() => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`Remove ${card.player_name} from your portfolio?`);
      if (confirmed) animateAndDelete();
    } else {
      Alert.alert("Remove card", `Remove ${card.player_name} from your portfolio?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: animateAndDelete },
      ]);
    }
  }, [card.player_name, animateAndDelete]);

  const maxHeight = height.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const marginBottom = height.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  const paidCents = card.purchase_price_cents * card.quantity;
  const currentCents = valuation ? valuation.currentValueCents * card.quantity : null;
  const plCents = currentCents !== null ? currentCents - paidCents : null;
  const plPct = paidCents > 0 && plCents !== null ? (plCents / paidCents) * 100 : null;
  const plColor = plCents !== null ? (plCents >= 0 ? TREND_COLORS.green : TREND_COLORS.red) : TREND_COLORS.gray;

  let trendPct = valuation?.trend30dPct ?? valuation?.trend7dPct ?? null;
  if (trendPct === null && valuation && valuation.recentSales.length >= 4) {
    const sales = valuation.recentSales;
    const mid = Math.floor(sales.length / 2);
    const olderAvg = sales.slice(0, mid).reduce((s, r) => s + r.priceCents, 0) / mid;
    const newerAvg = sales.slice(mid).reduce((s, r) => s + r.priceCents, 0) / (sales.length - mid);
    if (olderAvg > 0) {
      trendPct = Math.round(((newerAvg - olderAvg) / olderAvg) * 1000) / 10;
    }
  }
  const sparkColor = TREND_COLORS[trendColor(trendPct)];

  return (
    <Animated.View
      style={{
        maxHeight,
        marginBottom,
        opacity,
        transform: [{ translateX }],
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(card)}
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: "#e4e4e7",
        }}
      >
        {/* Top row: image + info + remove */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ marginRight: 12 }}>
            <CardImage
              imageUrl={card.image_url}
              playerName={card.player_name}
              setName={card.set_name}
              year={card.year}
              width={48}
              height={67}
            />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#18181b" }}>
              {card.player_name}
            </Text>
            <Text style={{ fontSize: 13, color: "#71717a", marginTop: 2 }}>
              {card.set_name ?? card.card_name} {card.year ? `(${card.year})` : ""}{" "}
              {card.card_number ? `#${card.card_number}` : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              <Text style={{ fontSize: 13, color: "#71717a" }}>
                Paid:{" "}
                <Text style={{ fontWeight: "600", color: "#18181b" }}>
                  {formatCents(card.purchase_price_cents)}
                </Text>
              </Text>
              <Text style={{ fontSize: 13, color: "#71717a" }}>Qty: {card.quantity}</Text>
              {card.grade && (
                <Text style={{ fontSize: 13, color: "#71717a" }}>{card.grade}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "600" }}>Remove</Text>
          </TouchableOpacity>
        </View>

        {/* Valuation bar */}
        <TouchableOpacity
          activeOpacity={0.6}
          disabled={!valuation || valuationLoading}
          onPress={(e) => {
            e.stopPropagation();
            if (valuation) {
              const name = [card.year, card.set_name, card.player_name, card.grade]
                .filter(Boolean)
                .join(" ");
              onSalesTap(valuation.soldListings, name, valuation.currentValueCents, card.image_url ?? null, {
                player_name: card.player_name,
                set_name: card.set_name,
                year: card.year,
                card_number: card.card_number,
                grade: card.grade,
              });
            }
          }}
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: "#f4f4f5",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {valuationLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ActivityIndicator size="small" color="#a1a1aa" />
              <Text style={{ fontSize: 11, color: "#a1a1aa" }}>Checking market...</Text>
            </View>
          ) : valuation ? (
            <>
              {/* Current value */}
              <View>
                <Text style={{ fontSize: 11, color: "#a1a1aa", fontWeight: "500" }}>
                  Market Value
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#18181b", marginTop: 1 }}>
                  {formatCents(valuation.currentValueCents)}
                </Text>
              </View>

              {/* P/L */}
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: "#a1a1aa", fontWeight: "500" }}>
                  P/L
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
                  <FontAwesome
                    name={plCents !== null && plCents >= 0 ? "arrow-up" : "arrow-down"}
                    size={10}
                    color={plColor}
                  />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: plColor }}>
                    {plCents !== null ? formatCents(Math.abs(plCents)) : "—"}
                  </Text>
                </View>
                {plPct !== null && (
                  <Text style={{ fontSize: 10, color: plColor, fontWeight: "500" }}>
                    {plPct >= 0 ? "+" : ""}{plPct.toFixed(1)}%
                  </Text>
                )}
              </View>

              {/* 30d trend */}
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: "#a1a1aa", fontWeight: "500" }}>
                  30d Trend
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: TREND_COLORS[trendColor(trendPct)],
                    marginTop: 1,
                  }}
                >
                  {formatPct(trendPct)}
                </Text>
              </View>

              {/* Sparkline + tap hint */}
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 11, color: "#a1a1aa", fontWeight: "500", marginBottom: 3 }}>
                  Sales ({valuation.numSales})
                </Text>
                <MiniSparkline
                  data={valuation.recentSales.map((s) => s.priceCents)}
                  color={sparkColor}
                  width={56}
                  height={20}
                />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}>
                  <Text style={{ fontSize: 9, color: "#3b82f6" }}>View</Text>
                  <FontAwesome name="chevron-right" size={7} color="#3b82f6" />
                </View>
              </View>
            </>
          ) : (
            <Text style={{ fontSize: 11, color: "#a1a1aa", fontStyle: "italic" }}>
              No market data available
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PortfolioScreen() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [editingCard, setEditingCard] = useState<PortfolioCard | null>(null);
  const [salesModal, setSalesModal] = useState<{
    listings: SoldListing[];
    cardName: string;
    avgCents: number | null;
    cardImageUrl: string | null;
    card: { player_name: string; set_name?: string | null; year?: number | null; card_number?: string | null; grade?: string | null };
  } | null>(null);

  const handleSalesTap = useCallback(
    (listings: SoldListing[], cardName: string, avgCents: number | null, cardImageUrl: string | null, cardInfo: { player_name: string; set_name?: string | null; year?: number | null; card_number?: string | null; grade?: string | null }) => {
      setSalesModal({ listings, cardName, avgCents, cardImageUrl, card: cardInfo });
    },
    []
  );

  const { data: cards = [], isLoading } = useQuery<PortfolioCard[]>({
    queryKey: ["portfolio", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("portfolio_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: valuations = {}, isLoading: valuationsLoading } = useQuery<
    Record<string, PortfolioValuation | null>
  >({
    queryKey: ["portfolio-valuations", cards.map((c) => c.id).join(",")],
    queryFn: async () => {
      const results: Record<string, PortfolioValuation | null> = {};
      await Promise.all(
        cards.map(async (card) => {
          results[card.id] = await fetchPortfolioValuation({
            player_name: card.player_name,
            set_name: card.set_name,
            year: card.year,
            card_number: card.card_number,
            grade: card.grade,
            image_url: card.image_url,
          });
        })
      );
      return results;
    },
    enabled: cards.length > 0,
    staleTime: 1000 * 60 * 15,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PortfolioCard> }) => {
      const { error } = await supabase
        .from("portfolio_cards")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      setEditingCard(null);
    },
  });

  const handleDelete = useCallback(
    (id: string, _name: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleUpdate = useCallback(
    (id: string, updates: Partial<PortfolioCard>) => {
      updateMutation.mutate({ id, updates });
    },
    [updateMutation]
  );

  if (authLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fafafa",
        }}
      >
        <Text style={{ color: "#71717a" }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: "#fafafa",
        }}
      >
        <Text
          style={{ fontSize: 20, fontWeight: "700", color: "#18181b", marginBottom: 8 }}
        >
          Sign in to view your portfolio
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#71717a",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Track your card collection like a stock portfolio
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{
            backgroundColor: "#18181b",
            borderRadius: 10,
            paddingHorizontal: 28,
            paddingVertical: 14,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalInvested = cards.reduce((sum, c) => sum + c.purchase_price_cents * c.quantity, 0);
  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);

  const totalCurrentValue = cards.reduce((sum, c) => {
    const v = valuations[c.id];
    return sum + (v ? v.currentValueCents * c.quantity : 0);
  }, 0);
  const hasValuations = Object.values(valuations).some(Boolean);
  const totalPL = hasValuations ? totalCurrentValue - totalInvested : null;
  const totalPLColor = totalPL !== null
    ? totalPL >= 0 ? TREND_COLORS.green : TREND_COLORS.red
    : TREND_COLORS.gray;

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: "#fafafa" }}>
        <View style={{ padding: 16 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={{ fontSize: 28, fontWeight: "700", color: "#18181b" }}>
                My Portfolio
              </Text>
              <Text style={{ fontSize: 15, color: "#71717a", marginTop: 4 }}>
                Track your cards like stocks
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/scan")}
              style={{
                backgroundColor: "#18181b",
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "#e4e4e7",
              }}
            >
              <Text style={{ fontSize: 13, color: "#71717a", fontWeight: "500" }}>
                Total Cards
              </Text>
              <AnimatedNumber
                value={totalCards}
                style={{ fontSize: 22, fontWeight: "700", color: "#18181b", marginTop: 6 }}
              />
              <Text style={{ fontSize: 12, color: "#a1a1aa", marginTop: 4 }}>
                {cards.length} unique
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "#e4e4e7",
              }}
            >
              <Text style={{ fontSize: 13, color: "#71717a", fontWeight: "500" }}>Invested</Text>
              <AnimatedNumber
                value={totalInvested}
                formatter={formatCents}
                style={{ fontSize: 22, fontWeight: "700", color: "#18181b", marginTop: 6 }}
              />
              <Text style={{ fontSize: 12, color: "#a1a1aa", marginTop: 4 }}>Cost basis</Text>
            </View>
          </View>

          {/* Portfolio value + P/L row */}
          {(hasValuations || valuationsLoading) && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#e4e4e7",
                }}
              >
                <Text style={{ fontSize: 13, color: "#71717a", fontWeight: "500" }}>
                  Market Value
                </Text>
                {valuationsLoading ? (
                  <ActivityIndicator size="small" color="#a1a1aa" style={{ marginTop: 8 }} />
                ) : (
                  <AnimatedNumber
                    value={totalCurrentValue}
                    formatter={formatCents}
                    style={{ fontSize: 22, fontWeight: "700", color: "#18181b", marginTop: 6 }}
                  />
                )}
                <Text style={{ fontSize: 12, color: "#a1a1aa", marginTop: 4 }}>
                  eBay comps
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#e4e4e7",
                }}
              >
                <Text style={{ fontSize: 13, color: "#71717a", fontWeight: "500" }}>
                  Total P/L
                </Text>
                {valuationsLoading ? (
                  <ActivityIndicator size="small" color="#a1a1aa" style={{ marginTop: 8 }} />
                ) : totalPL !== null ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <FontAwesome
                      name={totalPL >= 0 ? "arrow-up" : "arrow-down"}
                      size={14}
                      color={totalPLColor}
                    />
                    <AnimatedNumber
                      value={Math.abs(totalPL)}
                      formatter={formatCents}
                      style={{ fontSize: 22, fontWeight: "700", color: totalPLColor }}
                    />
                  </View>
                ) : (
                  <Text style={{ fontSize: 22, fontWeight: "700", color: "#a1a1aa", marginTop: 6 }}>
                    —
                  </Text>
                )}
                <Text style={{ fontSize: 12, color: "#a1a1aa", marginTop: 4 }}>
                  {totalPL !== null && totalInvested > 0
                    ? `${totalPL >= 0 ? "+" : ""}${((totalPL / totalInvested) * 100).toFixed(1)}%`
                    : "Unrealized"}
                </Text>
              </View>
            </View>
          )}

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#18181b",
              marginTop: 24,
              marginBottom: 12,
            }}
          >
            Your Cards
          </Text>

          {isLoading && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ color: "#71717a" }}>Loading portfolio...</Text>
            </View>
          )}

          {!isLoading && cards.length === 0 && (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 40,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#e4e4e7",
                borderStyle: "dashed",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "500", color: "#71717a" }}>
                No cards yet
              </Text>
              <Text style={{ fontSize: 13, color: "#a1a1aa", marginTop: 6 }}>
                Scan or add a card to get started
              </Text>
            </View>
          )}

          {cards.map((card) => (
            <PortfolioCardRow
              key={card.id}
              card={card}
              onDelete={handleDelete}
              onPress={setEditingCard}
              valuation={valuations[card.id]}
              valuationLoading={valuationsLoading}
              onSalesTap={handleSalesTap}
            />
          ))}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <EditCardModal
        card={editingCard}
        visible={editingCard !== null}
        onClose={() => setEditingCard(null)}
        onSave={handleUpdate}
        saving={updateMutation.isPending}
      />

      <SalesModal
        visible={salesModal !== null}
        onClose={() => setSalesModal(null)}
        listings={salesModal?.listings ?? []}
        cardName={salesModal?.cardName ?? ""}
        avgPriceCents={salesModal?.avgCents ?? null}
        cardImageUrl={salesModal?.cardImageUrl}
        card={salesModal?.card}
      />
    </>
  );
}
