import { View, Text, TouchableOpacity } from "react-native";
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { AnimatedNumber } from "./AnimatedNumber";
import { formatCents } from "@/lib/utils";
import { usePortfolioValuations } from "@/lib/use-portfolio-valuations";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { fetchLatestPortfolioSnapshot, upsertPortfolioSnapshot } from "@/lib/portfolio-snapshots";
import type { PortfolioCard, PortfolioSnapshot } from "@/lib/types";
import { palette, radius, shadow } from "@/lib/theme";

const COLORS = { green: "#4ade80", red: "#fb7185", gray: palette.textInverseMuted } as const;

function formatSnapshotDate(snapshotDate: string): string {
  const parsed = new Date(`${snapshotDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return snapshotDate;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRelativeUpdated(timestampMs: number): string {
  const mins = Math.floor((Date.now() - timestampMs) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestampMs).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function FreshnessPill({
  updating,
  label,
}: {
  updating: boolean;
  label: string | null;
}) {
  if (!updating && !label) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: updating ? "rgba(251,191,36,0.14)" : "rgba(255,255,255,0.08)",
        borderRadius: radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 3,
        maxWidth: "62%",
      }}
    >
      {updating && <FontAwesome name="refresh" size={9} color="#fbbf24" />}
      <Text
        style={{
          fontSize: 10,
          fontWeight: "600",
          color: updating ? "#fbbf24" : palette.textInverseMuted,
        }}
        numberOfLines={1}
      >
        {updating ? "Updating" : "Updated"}
        {label ? ` · ${label}` : ""}
      </Text>
    </View>
  );
}

export function PortfolioWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const snapshotSyncedRef = useRef<string | null>(null);

  const { data: cards = [] } = useQuery<PortfolioCard[]>({
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

  const { data: latestSnapshot = null } = useQuery<PortfolioSnapshot | null>({
    queryKey: ["portfolio-snapshot-latest", user?.id],
    queryFn: async () => {
      if (!user) return null;
      return fetchLatestPortfolioSnapshot(user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const {
    valuations,
    hasValuations: hasLiveValuations,
    valuationsLoading,
    isFetching: valuationsFetching,
    dataUpdatedAt,
  } = usePortfolioValuations(cards, user?.id);

  const totalCards = cards.reduce((s, c) => s + c.quantity, 0);
  const totalInvested = cards.reduce((s, c) => s + c.purchase_price_cents * c.quantity, 0);
  const liveCurrentValue = cards.reduce((s, c) => {
    const v = valuations[c.id];
    return s + (v ? v.currentValueCents * c.quantity : 0);
  }, 0);

  useEffect(() => {
    if (!user || !hasLiveValuations || valuationsLoading || cards.length === 0) return;

    const syncKey = `${user.id}:${liveCurrentValue}:${totalInvested}:${totalCards}`;
    if (snapshotSyncedRef.current === syncKey) return;

    snapshotSyncedRef.current = syncKey;
    upsertPortfolioSnapshot({
      userId: user.id,
      totalValueCents: liveCurrentValue,
      totalCostCents: totalInvested,
      cardCount: totalCards,
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["portfolio-snapshot-latest", user.id] });
        queryClient.invalidateQueries({ queryKey: ["portfolio-snapshots", user.id] });
      })
      .catch(() => {
        snapshotSyncedRef.current = null;
      });
  }, [
    user,
    hasLiveValuations,
    valuationsLoading,
    cards.length,
    liveCurrentValue,
    totalInvested,
    totalCards,
    queryClient,
  ]);

  if (!user || cards.length === 0) return null;

  const displayValue = hasLiveValuations
    ? liveCurrentValue
    : latestSnapshot
      ? latestSnapshot.total_value_cents
      : totalInvested;

  const displayPL = hasLiveValuations
    ? liveCurrentValue - totalInvested
    : latestSnapshot
      ? latestSnapshot.total_value_cents - latestSnapshot.total_cost_cents
      : null;

  const plColor =
    displayPL !== null ? (displayPL >= 0 ? COLORS.green : COLORS.red) : COLORS.gray;
  const plPct =
    displayPL !== null && totalInvested > 0 ? (displayPL / totalInvested) * 100 : null;

  const hasCachedDisplay = hasLiveValuations || latestSnapshot !== null;
  const isInitialLoad = valuationsLoading && !hasCachedDisplay;
  const isRefreshing = valuationsFetching && hasCachedDisplay;

  const freshnessLabel = hasLiveValuations
    ? formatRelativeUpdated(dataUpdatedAt)
    : latestSnapshot
      ? formatSnapshotDate(latestSnapshot.snapshot_date)
      : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push("/(tabs)/portfolio")}
      style={{
        backgroundColor: palette.heroDark,
        borderRadius: radius.xl,
        padding: 20,
        marginTop: 20,
        overflow: "hidden",
        ...shadow.md,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: palette.primary,
          opacity: 0.18,
        }}
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: radius.pill,
              backgroundColor: "rgba(59,130,246,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesome name="briefcase" size={13} color={palette.primarySoft} />
          </View>
          <Text
            style={{ fontSize: 12, fontWeight: "700", color: palette.textInverseMuted, letterSpacing: 0.4 }}
          >
            YOUR PORTFOLIO
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: radius.pill,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: palette.textInverse }}>View all</Text>
          <FontAwesome name="chevron-right" size={9} color={palette.textInverse} />
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text
            style={{ fontSize: 11, color: palette.textInverseMuted, fontWeight: "600", letterSpacing: 0.4 }}
          >
            MARKET VALUE
          </Text>
          <FreshnessPill
            updating={isRefreshing || isInitialLoad}
            label={freshnessLabel}
          />
        </View>
        {isInitialLoad ? (
          <Text
            style={{
              fontSize: 34,
              fontWeight: "700",
              color: palette.textInverseMuted,
              marginTop: 4,
              letterSpacing: -0.8,
            }}
          >
            —
          </Text>
        ) : (
          <AnimatedNumber
            value={displayValue}
            formatter={formatCents}
            style={{
              fontSize: 34,
              fontWeight: "700",
              color: palette.textInverse,
              marginTop: 4,
              letterSpacing: -0.8,
              opacity: isRefreshing ? 0.88 : 1,
            }}
          />
        )}
        {!hasLiveValuations && !isInitialLoad && latestSnapshot && (
          <Text style={{ fontSize: 11, color: palette.textInverseMuted, marginTop: 4 }}>
            Last saved total · refreshing live comps
          </Text>
        )}
        {!hasLiveValuations && !isInitialLoad && !latestSnapshot && (
          <Text style={{ fontSize: 11, color: palette.textInverseMuted, marginTop: 4 }}>
            Showing cost basis until live comps load
          </Text>
        )}
        {displayPL !== null && !isInitialLoad && (
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: plColor }}>
              {displayPL >= 0 ? "+" : ""}
              {formatCents(displayPL)}
            </Text>
            {plPct !== null && (
              <Text style={{ fontSize: 12, fontWeight: "600", color: plColor }}>
                ({plPct >= 0 ? "+" : ""}
                {plPct.toFixed(1)}%)
              </Text>
            )}
            <Text style={{ fontSize: 11, color: palette.textInverseMuted }}>all-time</Text>
          </View>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 12,
          marginTop: 18,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.08)",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: palette.textInverseMuted, fontWeight: "600", letterSpacing: 0.3 }}>
            CARDS
          </Text>
          <Text style={{ fontSize: 17, fontWeight: "700", color: palette.textInverse, marginTop: 2 }}>
            {totalCards}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: palette.textInverseMuted, fontWeight: "600", letterSpacing: 0.3 }}>
            COST BASIS
          </Text>
          <Text style={{ fontSize: 17, fontWeight: "700", color: palette.textInverse, marginTop: 2 }}>
            {formatCents(totalInvested)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: palette.textInverseMuted, fontWeight: "600", letterSpacing: 0.3 }}>
            UNIQUE
          </Text>
          <Text style={{ fontSize: 17, fontWeight: "700", color: palette.textInverse, marginTop: 2 }}>
            {cards.length}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
