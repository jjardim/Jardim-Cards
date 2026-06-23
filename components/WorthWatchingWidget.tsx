import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { CardImage } from "./CardImage";
import { formatCents, formatPct } from "@/lib/utils";
import { parseGradeParts } from "@/lib/parsing/grade";
import { buildCardDetailHref } from "@/lib/card-routes";
import { addToWatchlist, fetchTrending, fetchWatchlist } from "@/lib/api";
import {
  cardCatalogKey,
  cardIdentityKey,
  moverWatchKey,
  pickWorthWatchingCards,
  WORTH_WATCHING_PER_CATEGORY,
} from "@/lib/trending-utils";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { supabase } from "@/lib/supabase";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";
import { SPORTS, type MarketMover, type PortfolioCard, type Sport } from "@/lib/types";

const SLIDE_WIDTH = Dimensions.get("window").width - 32;

function marketMoverToWatchlistInput(card: MarketMover) {
  return {
    player_name: card.playerName,
    set_name: card.setName,
    year: card.year,
    grade: card.grade,
    sport: card.sport,
    image_url: card.imageUrl,
    snapshot_price_cents: card.avgPriceCents,
  };
}

function MoverSlide({
  card,
  categoryLabel,
  index,
  total,
  isTracked,
  isAdding,
  onTrack,
  onOpen,
}: {
  card: MarketMover;
  categoryLabel: string;
  index: number;
  total: number;
  isTracked: boolean;
  isAdding: boolean;
  onTrack: () => void;
  onOpen: () => void;
}) {
  const sport = getSportTheme(card.sport);
  const gradeParts = parseGradeParts(card.grade);
  const hasTrend = card.trend7dPct !== null;

  return (
    <View style={{ width: SLIDE_WIDTH }}>
      <View
        style={{
          backgroundColor: palette.heroDark,
          borderRadius: radius.xl,
          padding: 18,
          overflow: "hidden",
          ...shadow.md,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -50,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: palette.purple,
            opacity: 0.2,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -40,
            left: -20,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: sport.color,
            opacity: 0.18,
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
            <Text style={{ fontSize: 12 }}>{"\uD83D\uDC40"}</Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: palette.textInverse,
                letterSpacing: 0.4,
              }}
            >
              {`DISCOVER · ${categoryLabel.toUpperCase()}`}
            </Text>
          </View>
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
              }}
            >
              {gradeParts.company ? `${gradeParts.company} ${gradeParts.score ?? ""}`.trim() : "RAW"}
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: 11,
            color: palette.textInverseMuted,
            marginTop: 10,
            fontWeight: "600",
          }}
        >
          New hot cards · not in your portfolio or watchlist
        </Text>

        <TouchableOpacity activeOpacity={0.88} onPress={onOpen}>
          <View style={{ flexDirection: "row", marginTop: 14, gap: 14 }}>
            <View style={{ ...shadow.md }}>
              <CardImage
                imageUrl={card.imageUrl}
                playerName={card.playerName}
                setName={card.setName}
                year={card.year}
                width={100}
                height={138}
                borderRadius={12}
              />
            </View>

            <View style={{ flex: 1, justifyContent: "space-between" }}>
              <View>
                <Text
                  style={{
                    fontSize: 18,
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
                  }}
                >
                  {gradeParts.label.toUpperCase()} AVG
                </Text>
                <Text
                  style={{
                    fontSize: 26,
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
                    flexWrap: "wrap",
                  }}
                >
                  {hasTrend && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                        backgroundColor: "rgba(74,222,128,0.15)",
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: radius.pill,
                      }}
                    >
                      <FontAwesome name="arrow-up" size={9} color="#4ade80" />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#4ade80" }}>
                        {formatPct(card.trend7dPct)}
                      </Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 10, color: palette.textInverseMuted }}>
                    {`${card.numSales} comps · 7d`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 14,
          }}
        >
          <Text style={{ fontSize: 10, color: palette.textInverseMuted, fontWeight: "600" }}>
            {`#${index + 1} of ${total} in ${categoryLabel}`}
          </Text>
          <TouchableOpacity
            onPress={onTrack}
            disabled={isTracked || isAdding}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: isTracked ? "rgba(255,255,255,0.12)" : palette.primary,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: radius.pill,
              opacity: isTracked ? 0.85 : 1,
            }}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={palette.textInverse} />
            ) : (
              <>
                <FontAwesome
                  name={isTracked ? "check" : "plus"}
                  size={11}
                  color={palette.textInverse}
                />
                <Text style={{ fontSize: 13, fontWeight: "700", color: palette.textInverse }}>
                  {isTracked ? "Tracking" : "Track"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function WorthWatchingWidget({ yearMin, yearMax }: { yearMin?: number; yearMax?: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSport, setSelectedSport] = useState<Sport>("baseball");
  const [activeIndex, setActiveIndex] = useState(0);
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const categoryQueries = useQueries({
    queries: SPORTS.map((s) => ({
      queryKey: ["trending", s, yearMin, yearMax],
      queryFn: () => fetchTrending(s, yearMin, yearMax),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const isLoading = categoryQueries.some((q) => q.isLoading);

  const { data: portfolio = [] } = useQuery<PortfolioCard[]>({
    queryKey: ["portfolio", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("portfolio_cards")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: watchlist = [] } = useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    enabled: !!user,
  });

  const ownedCatalogKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of portfolio) {
      keys.add(
        cardCatalogKey({
          player_name: row.player_name,
          set_name: row.set_name,
          year: row.year,
        })
      );
    }
    return keys;
  }, [portfolio]);

  const watchedIdentityKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of watchlist) {
      keys.add(
        cardIdentityKey({
          search_key: row.search_key,
          grade: row.grade,
          player_name: row.player_name,
          set_name: row.set_name,
          year: row.year,
        })
      );
    }
    return keys;
  }, [watchlist]);

  const worthWatchingBySport = useMemo(() => {
    const result: Partial<Record<Sport, MarketMover[]>> = {};
    SPORTS.forEach((s, i) => {
      const data = categoryQueries[i]?.data ?? [];
      const picked = pickWorthWatchingCards(data, {
        excludeIdentityKeys: watchedIdentityKeys,
        excludeCatalogKeys: ownedCatalogKeys,
        limit: WORTH_WATCHING_PER_CATEGORY,
      });
      result[s] = picked;
    });
    return result;
  }, [categoryQueries, watchedIdentityKeys, ownedCatalogKeys]);

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedSport]);

  const categoryCards = worthWatchingBySport[selectedSport] ?? [];

  const trackedKeys = useMemo(() => new Set(watchedIdentityKeys), [watchedIdentityKeys]);

  const trackMutation = useMutation({
    mutationFn: addToWatchlist,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      showToast(`Added ${vars.player_name} to watchlist`, "success");
    },
    onError: (error: Error) => {
      showToast(error.message ?? "Could not add to watchlist", "error");
    },
    onSettled: () => setAddingKey(null),
  });

  const handleTrack = useCallback(
    (card: MarketMover) => {
      if (!user) {
        router.push("/(auth)/login");
        return;
      }
      if (trackedKeys.has(moverWatchKey(card))) return;
      setAddingKey(moverWatchKey(card));
      trackMutation.mutate(marketMoverToWatchlistInput(card));
    },
    [user, router, trackedKeys, trackMutation]
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setActiveIndex(Math.round(x / SLIDE_WIDTH));
  }, []);

  const hasTrendingData = categoryQueries.some((q) => (q.data?.length ?? 0) > 0);

  if (isLoading) {
    return (
      <View style={{ marginTop: 18, alignItems: "center", paddingVertical: 24 }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!hasTrendingData) return null;

  const categoryTheme = getSportTheme(selectedSport);

  return (
    <View style={{ marginTop: 18 }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {SPORTS.map((s) => {
          const theme = getSportTheme(s);
          const count = worthWatchingBySport[s]?.length ?? 0;
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
                backgroundColor: active ? theme.color : palette.surface,
                borderWidth: active ? 0 : 1,
                borderColor: palette.borderSoft,
                opacity: active || count > 0 ? 1 : 0.72,
                ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
                ...(active ? shadow.sm : {}),
              }}
            >
              <Text style={{ fontSize: 12 }}>{theme.emoji}</Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: active ? "800" : "600",
                  color: active ? palette.textInverse : palette.textMuted,
                }}
              >
                {theme.label}
              </Text>
              {count > 0 ? (
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: active ? palette.textInverseMuted : palette.textSubtle,
                  }}
                >
                  {count}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {categoryCards.length === 0 ? (
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            padding: 24,
            alignItems: "center",
            ...shadow.sm,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: palette.text }}>
            No new {categoryTheme.label.toLowerCase()} movers
          </Text>
          <Text style={{ fontSize: 12, color: palette.textSubtle, marginTop: 6, textAlign: "center" }}>
            You may already track the hottest cards in this category. Try another category.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={SLIDE_WIDTH}
            snapToAlignment="start"
            nestedScrollEnabled
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {categoryCards.map((card, index) => {
              const key = moverWatchKey(card);
              return (
                <MoverSlide
                  key={key}
                  card={card}
                  categoryLabel={categoryTheme.label}
                  index={index}
                  total={categoryCards.length}
                  isTracked={trackedKeys.has(key)}
                  isAdding={addingKey === key && trackMutation.isPending}
                  onTrack={() => handleTrack(card)}
                  onOpen={() => router.push(buildCardDetailHref(card) as never)}
                />
              );
            })}
          </ScrollView>

          {categoryCards.length > 1 && (
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }}>
              {categoryCards.map((card, i) => (
                <View
                  key={moverWatchKey(card)}
                  style={{
                    width: i === activeIndex ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === activeIndex ? categoryTheme.color : palette.borderSoft,
                  }}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}
