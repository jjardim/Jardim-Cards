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
import type { PortfolioValuation, SoldListing } from "@/lib/api";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";
import { PLBar } from "@/components/PLBar";

const TREND_COLORS = { green: palette.success, red: palette.danger, gray: palette.textSubtle } as const;

function PortfolioStat({
  label,
  subtitle,
  children,
}: {
  label: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        padding: 16,
        ...shadow.sm,
      }}
    >
      <Text
        style={{ fontSize: 11, color: palette.textMuted, fontWeight: "700", letterSpacing: 0.4 }}
      >
        {label}
      </Text>
      {children}
      {subtitle && (
        <Text style={{ fontSize: 11, color: palette.textSubtle, marginTop: 4 }}>{subtitle}</Text>
      )}
    </View>
  );
}

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
    outputRange: [0, 240],
  });

  const marginBottom = height.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  const sportTheme = getSportTheme(card.sport);

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
        activeOpacity={0.75}
        onPress={() => onPress(card)}
        style={{
          backgroundColor: palette.surface,
          borderRadius: radius.lg,
          padding: 14,
          overflow: "hidden",
          ...shadow.sm,
        }}
      >
        {/* Thin sport-colored accent bar on the left edge */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: sportTheme.color,
          }}
        />

        {/* Top row: image + info + sport badge */}
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <CardImage
            imageUrl={card.image_url}
            playerName={card.player_name}
            setName={card.set_name}
            year={card.year}
            width={52}
            height={73}
            borderRadius={6}
          />
          <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 10 }}>{sportTheme.emoji}</Text>
              <Text
                style={{ fontSize: 10, color: palette.textSubtle, fontWeight: "700", letterSpacing: 0.3 }}
              >
                {(card.set_name ?? "CARD").toUpperCase()}
                {card.year ? ` \u00B7 ${card.year}` : ""}
              </Text>
            </View>
            <Text
              style={{ fontSize: 15, fontWeight: "700", color: palette.text, marginTop: 2 }}
              numberOfLines={1}
            >
              {card.player_name}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              <View
                style={{
                  backgroundColor: palette.bgMuted,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                }}
              >
                <Text style={{ fontSize: 11, color: palette.textMuted, fontWeight: "600" }}>
                  Paid {formatCents(card.purchase_price_cents)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: palette.bgMuted,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                }}
              >
                <Text style={{ fontSize: 11, color: palette.textMuted, fontWeight: "600" }}>
                  Qty {card.quantity}
                </Text>
              </View>
              {card.grade && (
                <View
                  style={{
                    backgroundColor: palette.primaryBg,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: radius.pill,
                  }}
                >
                  <Text style={{ fontSize: 11, color: palette.primary, fontWeight: "700" }}>
                    {card.grade}
                  </Text>
                </View>
              )}
              {card.card_number && (
                <View
                  style={{
                    backgroundColor: palette.bgMuted,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: radius.pill,
                  }}
                >
                  <Text style={{ fontSize: 11, color: palette.textMuted, fontWeight: "600" }}>
                    #{card.card_number}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 28,
              height: 28,
              borderRadius: radius.pill,
              backgroundColor: palette.dangerBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesome name="times" size={11} color={palette.danger} />
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
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: palette.borderSoft,
          }}
        >
          {valuationLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ActivityIndicator size="small" color={palette.textSubtle} />
              <Text style={{ fontSize: 11, color: palette.textMuted }}>Checking market...</Text>
            </View>
          ) : valuation ? (
            <>
              {/* Big-number row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <View>
                  <Text
                    style={{ fontSize: 10, color: palette.textSubtle, fontWeight: "700", letterSpacing: 0.3 }}
                  >
                    MARKET VALUE
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "700",
                      color: palette.text,
                      marginTop: 2,
                      letterSpacing: -0.4,
                    }}
                  >
                    {formatCents(valuation.currentValueCents)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: plCents !== null && plCents >= 0 ? palette.successBg : palette.dangerBg,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: radius.pill,
                    }}
                  >
                    <FontAwesome
                      name={plCents !== null && plCents >= 0 ? "arrow-up" : "arrow-down"}
                      size={9}
                      color={plColor}
                    />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: plColor }}>
                      {plCents !== null ? formatCents(Math.abs(plCents)) : "\u2014"}
                    </Text>
                    {plPct !== null && (
                      <Text style={{ fontSize: 11, fontWeight: "700", color: plColor }}>
                        ({plPct >= 0 ? "+" : ""}
                        {plPct.toFixed(1)}%)
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* P/L progress bar */}
              <PLBar pct={plPct} />

              {/* Bottom row: 30d trend + sparkline */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 11, color: palette.textSubtle, fontWeight: "600" }}>
                    30d
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: TREND_COLORS[trendColor(trendPct)],
                    }}
                  >
                    {formatPct(trendPct)}
                  </Text>
                  <Text style={{ fontSize: 11, color: palette.textSubtle }}>
                    {`\u00B7 ${valuation.numSales} sales`}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MiniSparkline
                    data={valuation.recentSales.map((s) => s.priceCents)}
                    color={sparkColor}
                    width={56}
                    height={20}
                  />
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      const key = [card.year, card.set_name, card.player_name]
                        .filter(Boolean)
                        .map((s) =>
                          String(s)
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)/g, "")
                        )
                        .join("-");
                      const qs = new URLSearchParams({
                        player: card.player_name,
                        ...(card.set_name ? { set: card.set_name } : {}),
                        ...(card.year ? { year: card.year.toString() } : {}),
                        ...(card.grade ? { grade: card.grade } : {}),
                        sport: card.sport,
                      }).toString();
                      router.push(`/card/${key}?${qs}` as never);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                      backgroundColor: palette.primaryBg,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: radius.pill,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <FontAwesome name="line-chart" size={9} color={palette.primary} />
                    <Text style={{ fontSize: 11, color: palette.primary, fontWeight: "700" }}>
                      Details
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <Text style={{ fontSize: 11, color: palette.textSubtle, fontStyle: "italic" }}>
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
            ebay_title: card.ebay_title,
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
          backgroundColor: palette.bg,
        }}
      >
        <Text style={{ color: palette.textMuted }}>Loading...</Text>
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
          backgroundColor: palette.bg,
        }}
      >
        <Text
          style={{ fontSize: 20, fontWeight: "700", color: palette.text, marginBottom: 8 }}
        >
          Sign in to view your portfolio
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: palette.textMuted,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Track your card collection like a stock portfolio
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{
            backgroundColor: palette.heroDark,
            borderRadius: radius.pill,
            paddingHorizontal: 28,
            paddingVertical: 14,
          }}
        >
          <Text style={{ color: palette.textInverse, fontWeight: "700", fontSize: 15 }}>Sign in</Text>
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
      <ScrollView style={{ flex: 1, backgroundColor: palette.bg }}>
        <View style={{ padding: 16 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{ fontSize: 30, fontWeight: "700", color: palette.text, letterSpacing: -0.8 }}
              >
                My Portfolio
              </Text>
              <Text style={{ fontSize: 14, color: palette.textMuted, marginTop: 4 }}>
                Track your cards like stocks
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/scan")}
              activeOpacity={0.85}
              style={{
                backgroundColor: palette.heroDark,
                borderRadius: radius.pill,
                paddingHorizontal: 18,
                paddingVertical: 11,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                ...shadow.sm,
              }}
            >
              <FontAwesome name="plus" size={12} color={palette.textInverse} />
              <Text style={{ color: palette.textInverse, fontWeight: "700", fontSize: 13 }}>
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <PortfolioStat label="TOTAL CARDS" subtitle={`${cards.length} unique`}>
              <AnimatedNumber
                value={totalCards}
                style={{ fontSize: 26, fontWeight: "700", color: palette.text, letterSpacing: -0.6, marginTop: 8 }}
              />
            </PortfolioStat>
            <PortfolioStat label="INVESTED" subtitle="cost basis">
              <AnimatedNumber
                value={totalInvested}
                formatter={formatCents}
                style={{ fontSize: 26, fontWeight: "700", color: palette.text, letterSpacing: -0.6, marginTop: 8 }}
              />
            </PortfolioStat>
          </View>

          {/* Portfolio value + P/L row */}
          {(hasValuations || valuationsLoading) && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <PortfolioStat label="MARKET VALUE" subtitle="eBay comps">
                {valuationsLoading ? (
                  <ActivityIndicator size="small" color={palette.textSubtle} style={{ marginTop: 10 }} />
                ) : (
                  <AnimatedNumber
                    value={totalCurrentValue}
                    formatter={formatCents}
                    style={{ fontSize: 26, fontWeight: "700", color: palette.text, letterSpacing: -0.6, marginTop: 8 }}
                  />
                )}
              </PortfolioStat>
              <PortfolioStat
                label="TOTAL P/L"
                subtitle={
                  totalPL !== null && totalInvested > 0
                    ? `${totalPL >= 0 ? "+" : ""}${((totalPL / totalInvested) * 100).toFixed(1)}%`
                    : "Unrealized"
                }
              >
                {valuationsLoading ? (
                  <ActivityIndicator size="small" color={palette.textSubtle} style={{ marginTop: 10 }} />
                ) : totalPL !== null ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <FontAwesome
                      name={totalPL >= 0 ? "arrow-up" : "arrow-down"}
                      size={14}
                      color={totalPLColor}
                    />
                    <AnimatedNumber
                      value={Math.abs(totalPL)}
                      formatter={formatCents}
                      style={{ fontSize: 26, fontWeight: "700", color: totalPLColor, letterSpacing: -0.6 }}
                    />
                  </View>
                ) : (
                  <Text
                    style={{
                      fontSize: 26,
                      fontWeight: "700",
                      color: palette.textSubtle,
                      marginTop: 8,
                    }}
                  >
                    —
                  </Text>
                )}
              </PortfolioStat>
            </View>
          )}

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: palette.text,
              letterSpacing: -0.3,
              marginTop: 24,
              marginBottom: 12,
            }}
          >
            Your Cards
          </Text>

          {isLoading && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ color: palette.textMuted }}>Loading portfolio...</Text>
            </View>
          )}

          {!isLoading && cards.length === 0 && (
            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: radius.lg,
                padding: 40,
                alignItems: "center",
                ...shadow.sm,
              }}
            >
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83C\uDFAF"}</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: palette.text }}>
                No cards yet
              </Text>
              <Text style={{ fontSize: 13, color: palette.textSubtle, marginTop: 6 }}>
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
