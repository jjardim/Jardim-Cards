import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQuery, useQueries } from "@tanstack/react-query";
import { router } from "expo-router";
import { CardImage } from "@/components/CardImage";
import { AddToWatchlistModal } from "@/components/AddToWatchlistModal";
import { EditWatchlistModal } from "@/components/EditWatchlistModal";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { MiniSparkline } from "@/components/MiniSparkline";
import { PLBar } from "@/components/PLBar";
import { formatCents } from "@/lib/utils";
import { fetchWatchlist, fetchWatchlistValuation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";
import type { WatchlistCard } from "@/lib/types";

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

function buildSearchKey(card: WatchlistCard): string {
  return (
    card.search_key ||
    [card.year, card.set_name, card.player_name]
      .filter(Boolean)
      .map((s) =>
        String(s)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      )
      .join("-")
  );
}

function WatchlistRow({
  card,
  onEdit,
}: {
  card: WatchlistCard;
  onEdit: (card: WatchlistCard, currentMarketCents: number | null) => void;
}) {
  const sport = getSportTheme(card.sport);

  const { data: valuation, isLoading: valuationLoading } = useQuery({
    queryKey: ["watchlist-valuation", card.id],
    queryFn: () => fetchWatchlistValuation(card),
    staleTime: 1000 * 60 * 10,
  });

  const currentCents = valuation?.currentValueCents ?? null;
  const snapshotCents = card.snapshot_price_cents;
  const deltaCents =
    currentCents != null && snapshotCents != null ? currentCents - snapshotCents : null;
  const deltaPct =
    deltaCents != null && snapshotCents && snapshotCents > 0
      ? (deltaCents / snapshotCents) * 100
      : null;
  const isGain = (deltaCents ?? 0) >= 0;
  const deltaColor = isGain ? palette.success : palette.danger;

  const targetCents = card.target_price_cents;
  const targetHit =
    targetCents != null && currentCents != null && currentCents <= targetCents;

  const daysTracked = daysSince(card.created_at);

  const goToDetail = useCallback(() => {
    const key = buildSearchKey(card);
    const qs = new URLSearchParams({
      player: card.player_name,
      ...(card.set_name ? { set: card.set_name } : {}),
      ...(card.year ? { year: card.year.toString() } : {}),
      ...(card.grade ? { grade: card.grade } : {}),
      sport: card.sport,
    }).toString();
    router.push(`/card/${key}?${qs}` as never);
  }, [card]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={goToDetail}
      style={{
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        padding: 14,
        marginBottom: 12,
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
          backgroundColor: targetHit ? palette.success : sport.color,
        }}
      />

      {/* Target hit banner */}
      {targetHit && targetCents != null && currentCents != null && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: palette.successBg,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: radius.pill,
            alignSelf: "flex-start",
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 11 }}>{"\uD83C\uDFAF"}</Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: palette.success,
              letterSpacing: 0.3,
            }}
          >
            {`TARGET HIT \u00B7 ${formatCents(currentCents)} \u2264 ${formatCents(targetCents)}`}
          </Text>
        </View>
      )}

      {/* Top row: image + info + edit */}
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
            <Text style={{ fontSize: 10 }}>{sport.emoji}</Text>
            <Text
              style={{
                fontSize: 10,
                color: palette.textSubtle,
                fontWeight: "700",
                letterSpacing: 0.3,
              }}
              numberOfLines={1}
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
            <View
              style={{
                backgroundColor: palette.bgMuted,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radius.pill,
              }}
            >
              <Text style={{ fontSize: 11, color: palette.textMuted, fontWeight: "600" }}>
                {daysTracked === 0
                  ? "added today"
                  : daysTracked === 1
                  ? "1 day tracked"
                  : `${daysTracked} days tracked`}
              </Text>
            </View>
            {targetCents != null && !targetHit && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: palette.warningBg,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                }}
              >
                <Text style={{ fontSize: 9 }}>{"\uD83C\uDFAF"}</Text>
                <Text style={{ fontSize: 11, color: palette.warning, fontWeight: "700" }}>
                  {`target ${formatCents(targetCents)}`}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onEdit(card, currentCents);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.pill,
            backgroundColor: palette.bgMuted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="ellipsis-h" size={11} color={palette.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Valuation / delta */}
      <View
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
        ) : currentCents == null ? (
          <Text style={{ fontSize: 11, color: palette.textSubtle, fontStyle: "italic" }}>
            No market data available
          </Text>
        ) : (
          <>
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
                  style={{
                    fontSize: 10,
                    color: palette.textSubtle,
                    fontWeight: "700",
                    letterSpacing: 0.3,
                  }}
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
                  {formatCents(currentCents)}
                </Text>
                {snapshotCents != null && (
                  <Text style={{ fontSize: 11, color: palette.textSubtle, marginTop: 2 }}>
                    {`since ${formatCents(snapshotCents)} added`}
                  </Text>
                )}
              </View>
              {deltaCents != null ? (
                <View style={{ alignItems: "flex-end" }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: isGain ? palette.successBg : palette.dangerBg,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: radius.pill,
                    }}
                  >
                    <FontAwesome
                      name={isGain ? "arrow-up" : "arrow-down"}
                      size={9}
                      color={deltaColor}
                    />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: deltaColor }}>
                      {formatCents(Math.abs(deltaCents))}
                    </Text>
                    {deltaPct != null && (
                      <Text style={{ fontSize: 11, fontWeight: "700", color: deltaColor }}>
                        ({deltaPct >= 0 ? "+" : ""}
                        {deltaPct.toFixed(1)}%)
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: palette.bgMuted,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: radius.pill,
                  }}
                >
                  <Text
                    style={{ fontSize: 10, fontWeight: "700", color: palette.textMuted }}
                  >
                    NO SNAPSHOT
                  </Text>
                </View>
              )}
            </View>

            {deltaPct != null && <PLBar pct={deltaPct} />}

            {valuation && valuation.recentSales.length > 1 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                <Text style={{ fontSize: 11, color: palette.textSubtle }}>
                  {`${valuation.numSales} recent sales`}
                </Text>
                <MiniSparkline
                  data={valuation.recentSales.map((s) => s.priceCents)}
                  color={deltaColor}
                  width={60}
                  height={20}
                />
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function WatchlistScreen() {
  const { user, loading: authLoading } = useAuth();
  const [addVisible, setAddVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<WatchlistCard | null>(null);
  const [editingMarketCents, setEditingMarketCents] = useState<number | null>(null);

  const { data: cards = [], isLoading: cardsLoading } = useQuery<WatchlistCard[]>({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    enabled: !!user,
  });

  const handleEdit = useCallback(
    (card: WatchlistCard, currentMarketCents: number | null) => {
      setEditingCard(card);
      setEditingMarketCents(currentMarketCents);
    },
    []
  );

  // Aggregate stats across all watchlist entries
  const valuationResults = useQueries({
    queries: cards.map((card) => ({
      queryKey: ["watchlist-valuation", card.id],
      queryFn: () => fetchWatchlistValuation(card),
      staleTime: 1000 * 60 * 10,
      enabled: !!user,
    })),
  });

  const stats = useMemo(() => {
    let totalValue = 0;
    let totalSnapshot = 0;
    let gainers = 0;
    let losers = 0;
    let targetHits = 0;
    cards.forEach((card, i) => {
      const valuation = valuationResults[i]?.data;
      if (!valuation) return;
      totalValue += valuation.currentValueCents;
      if (card.snapshot_price_cents != null) {
        totalSnapshot += card.snapshot_price_cents;
        const delta = valuation.currentValueCents - card.snapshot_price_cents;
        if (delta >= 0) gainers += 1;
        else losers += 1;
      }
      if (
        card.target_price_cents != null &&
        valuation.currentValueCents <= card.target_price_cents
      ) {
        targetHits += 1;
      }
    });
    const totalDelta = totalValue - totalSnapshot;
    const totalDeltaPct =
      totalSnapshot > 0 ? (totalDelta / totalSnapshot) * 100 : null;
    return {
      totalValue,
      totalSnapshot,
      totalDelta,
      totalDeltaPct,
      gainers,
      losers,
      targetHits,
    };
  }, [cards, valuationResults]);

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
        <ActivityIndicator color={palette.primary} />
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
          backgroundColor: palette.bg,
          padding: 32,
        }}
      >
        <Text style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83D\uDC40"}</Text>
        <Text
          style={{ fontSize: 18, fontWeight: "700", color: palette.text, letterSpacing: -0.3 }}
        >
          Sign in to track cards
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: palette.textMuted,
            marginTop: 6,
            textAlign: "center",
          }}
        >
          Your watchlist lives in your account so you can see price moves from any device.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/profile" as never)}
          style={{
            backgroundColor: palette.heroDark,
            paddingHorizontal: 20,
            paddingVertical: 11,
            borderRadius: radius.pill,
            marginTop: 20,
            ...shadow.sm,
          }}
        >
          <Text
            style={{ color: palette.textInverse, fontWeight: "700", fontSize: 13 }}
          >
            Go to sign in
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: palette.bg }}>
        <View style={{ padding: 16 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "700",
                  color: palette.text,
                  letterSpacing: -0.8,
                }}
              >
                Watchlist
              </Text>
              <Text style={{ fontSize: 13, color: palette.textMuted, marginTop: 2 }}>
                {`Cards you\u2019re hunting \u00B7 ${cards.length} ${cards.length === 1 ? "card" : "cards"}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setAddVisible(true)}
              style={{
                backgroundColor: palette.heroDark,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: radius.pill,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                ...shadow.sm,
              }}
            >
              <FontAwesome name="plus" size={11} color={palette.textInverse} />
              <Text
                style={{ color: palette.textInverse, fontWeight: "700", fontSize: 13 }}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stat hero */}
          {cards.length > 0 && (
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
                  top: -40,
                  right: -40,
                  width: 170,
                  height: 170,
                  borderRadius: 85,
                  backgroundColor:
                    (stats.totalDelta ?? 0) >= 0 ? palette.success : palette.danger,
                  opacity: 0.18,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: radius.pill,
                    backgroundColor: "rgba(96,165,250,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FontAwesome name="eye" size={11} color={palette.primarySoft} />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: palette.textInverseMuted,
                    letterSpacing: 0.5,
                  }}
                >
                  HUNTING MARKET
                </Text>
                {stats.targetHits > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: "rgba(74,222,128,0.18)",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: radius.pill,
                      marginLeft: "auto",
                    }}
                  >
                    <Text style={{ fontSize: 10 }}>{"\uD83C\uDFAF"}</Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: "#4ade80",
                        letterSpacing: 0.3,
                      }}
                    >
                      {`${stats.targetHits} TARGET HIT${stats.targetHits > 1 ? "S" : ""}`}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ marginTop: 14 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: palette.textInverseMuted,
                    fontWeight: "700",
                    letterSpacing: 0.3,
                  }}
                >
                  TOTAL MARKET VALUE
                </Text>
                <AnimatedNumber
                  value={stats.totalValue}
                  formatter={formatCents}
                  style={{
                    fontSize: 32,
                    fontWeight: "700",
                    color: palette.textInverse,
                    marginTop: 4,
                    letterSpacing: -0.8,
                  }}
                />
                {stats.totalDeltaPct != null && (
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
                        gap: 4,
                        backgroundColor:
                          stats.totalDelta >= 0
                            ? "rgba(74,222,128,0.15)"
                            : "rgba(251,113,133,0.15)",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: radius.pill,
                      }}
                    >
                      <FontAwesome
                        name={stats.totalDelta >= 0 ? "arrow-up" : "arrow-down"}
                        size={10}
                        color={stats.totalDelta >= 0 ? "#4ade80" : "#fb7185"}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: stats.totalDelta >= 0 ? "#4ade80" : "#fb7185",
                        }}
                      >
                        {formatCents(Math.abs(stats.totalDelta))}{" "}
                        ({stats.totalDeltaPct >= 0 ? "+" : ""}
                        {stats.totalDeltaPct.toFixed(1)}%)
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: palette.textInverseMuted }}>
                      since added
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: 14,
                  marginTop: 16,
                  paddingTop: 14,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255,255,255,0.08)",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: palette.textInverseMuted,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                    }}
                  >
                    TRACKING
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: palette.textInverse,
                      marginTop: 2,
                    }}
                  >
                    {cards.length}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: palette.textInverseMuted,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                    }}
                  >
                    GAINERS
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#4ade80",
                      marginTop: 2,
                    }}
                  >
                    {stats.gainers}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: palette.textInverseMuted,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                    }}
                  >
                    LOSERS
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#fb7185",
                      marginTop: 2,
                    }}
                  >
                    {stats.losers}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: palette.text,
              letterSpacing: -0.2,
              marginTop: 22,
              marginBottom: 12,
            }}
          >
            Prospects
          </Text>

          {cardsLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : cards.length === 0 ? (
            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: radius.lg,
                padding: 28,
                alignItems: "center",
                ...shadow.sm,
              }}
            >
              <Text style={{ fontSize: 34, marginBottom: 8 }}>{"\uD83D\uDC40"}</Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: palette.text,
                  letterSpacing: -0.2,
                }}
              >
                Nothing on watch yet
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: palette.textMuted,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {"Tap Add to hunt down cards you want. We\u2019ll snapshot the price so you can see every move."}
              </Text>
              <TouchableOpacity
                onPress={() => setAddVisible(true)}
                style={{
                  backgroundColor: palette.primary,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: radius.pill,
                  marginTop: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FontAwesome name="plus" size={11} color={palette.textInverse} />
                <Text
                  style={{
                    color: palette.textInverse,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  Add first card
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            cards.map((card) => (
              <WatchlistRow key={card.id} card={card} onEdit={handleEdit} />
            ))
          )}

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      <AddToWatchlistModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
      />

      <EditWatchlistModal
        card={editingCard}
        visible={!!editingCard}
        onClose={() => setEditingCard(null)}
        currentMarketCents={editingMarketCents}
      />
    </>
  );
}
