/**
 * Material 3 Expressive preview of the dashboard home.
 *
 * Self-contained experiment at /m3-home — does NOT touch the production
 * home at app/(tabs)/index.tsx. Demonstrates M3 Expressive's 7 emphasis
 * tactics applied to the Cards Tracker dashboard:
 *   1. Variety of shapes (mixed corner radii, decorative SVG shapes)
 *   2. Rich tri-color hierarchy (primary / secondary / tertiary)
 *   3. Emphasized typography (Display / Headline emphasized variants)
 *   4. Contained content (5-step surface container scale)
 *   5. Fluid spring motion on press
 *   6. Flexible components (button group with shape morph)
 *   7. Hero moments (combined tactics on the top gainer card)
 */
import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Svg, { Circle, Path } from "react-native-svg";

import { fetchTrending } from "@/lib/api";
import { SPORTS, type MarketMover } from "@/lib/types";
import { formatCents, formatPct } from "@/lib/utils";
import { CardImage } from "@/components/CardImage";
import {
  m3Color,
  m3Shape,
  m3Space,
  m3Type,
  m3Elevation,
  m3Motion,
} from "@/lib/m3/theme";

const SPORT_META: Record<string, { label: string; emoji: string }> = {
  baseball: { label: "Baseball", emoji: "\u26BE" },
  basketball: { label: "Basketball", emoji: "\uD83C\uDFC0" },
  football: { label: "Football", emoji: "\uD83C\uDFC8" },
  hockey: { label: "Hockey", emoji: "\uD83C\uDFD2" },
  pokemon: { label: "Pok\u00E9mon", emoji: "\u2728" },
  formula1: { label: "F1", emoji: "\uD83C\uDFCE" },
};

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

/**
 * Spring-animated Pressable used to evoke M3's shape morph + scale on press.
 * Tactic #5 — fluid motion via the motion physics system.
 */
function SpringPressable({
  onPress,
  style,
  children,
  scaleTo = 0.96,
  spring = m3Motion.springFast,
}: {
  onPress?: () => void;
  style?: React.ComponentProps<typeof Animated.View>["style"];
  children: React.ReactNode;
  scaleTo?: number;
  spring?: { stiffness: number; damping: number; mass: number };
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      stiffness: spring.stiffness,
      damping: spring.damping,
      mass: spring.mass,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(scaleTo)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * Decorative 4-point star (M3 Expressive shape library inspiration).
 * Used as a hero accent — tactic #1 (variety of shapes) + #7 (hero moments).
 */
function FourPointStar({ size, color }: { size: number; color: string }) {
  const half = size / 2;
  // Concave 4-pointer that reads as a "spark" / "burst"
  const path = `M ${half} 0 C ${half} ${half * 0.7}, ${size} ${half * 0.7}, ${size} ${half} C ${size} ${half * 1.3}, ${half} ${half * 1.3}, ${half} ${size} C ${half} ${half * 1.3}, 0 ${half * 1.3}, 0 ${half} C 0 ${half * 0.7}, ${half} ${half * 0.7}, ${half} 0 Z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path d={path} fill={color} />
    </Svg>
  );
}

/**
 * Soft burst — 8 rounded petals around a center. Used on the avatar slot.
 */
function SoftBurst({ size, color }: { size: number; color: string }) {
  const r = size / 2;
  const petals = 8;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {Array.from({ length: petals }).map((_, i) => {
        const angle = (i * 360) / petals;
        const rad = (angle * Math.PI) / 180;
        const px = r + Math.cos(rad) * r * 0.62;
        const py = r + Math.sin(rad) * r * 0.62;
        return <Circle key={i} cx={px} cy={py} r={r * 0.42} fill={color} />;
      })}
      <Circle cx={r} cy={r} r={r * 0.55} fill={color} />
    </Svg>
  );
}

/**
 * Connected segmented "button group" — a flagship M3 Expressive component.
 * Selected button is fully rounded ("pill") while siblings squeeze toward a
 * smaller radius, creating the shape-morph rhythm.
 */
function ButtonGroup<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string; emoji?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {items.map((item, i) => {
        const active = item.value === value;
        const isFirst = i === 0;
        const isLast = i === items.length - 1;
        return (
          <SpringPressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={{ flex: 1 }}
            scaleTo={0.94}
          >
            <View
              style={{
                paddingVertical: 12,
                paddingHorizontal: 12,
                backgroundColor: active ? m3Color.primary : m3Color.surfaceContainerHigh,
                borderTopLeftRadius: active ? m3Shape.full : isFirst ? m3Shape.full : m3Shape.sm,
                borderBottomLeftRadius: active ? m3Shape.full : isFirst ? m3Shape.full : m3Shape.sm,
                borderTopRightRadius: active ? m3Shape.full : isLast ? m3Shape.full : m3Shape.sm,
                borderBottomRightRadius: active ? m3Shape.full : isLast ? m3Shape.full : m3Shape.sm,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
              }}
            >
              {item.emoji && <Text style={{ fontSize: 14 }}>{item.emoji}</Text>}
              <Text
                style={{
                  ...m3Type.labelLargeEmphasized,
                  color: active ? m3Color.onPrimary : m3Color.onSurfaceVariant,
                }}
              >
                {item.label}
              </Text>
            </View>
          </SpringPressable>
        );
      })}
    </View>
  );
}

/**
 * Small filled-tonal chip with shape-morph feel. Used for the era filter.
 */
function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <SpringPressable onPress={onPress} scaleTo={0.92}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: active ? m3Shape.md : m3Shape.full,
          backgroundColor: active ? m3Color.secondaryContainer : m3Color.surfaceContainerLow,
          borderWidth: active ? 0 : 1,
          borderColor: m3Color.outlineVariant,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        {active && (
          <FontAwesome name="check" size={11} color={m3Color.onSecondaryContainer} />
        )}
        <Text
          style={{
            ...m3Type.labelLargeEmphasized,
            color: active ? m3Color.onSecondaryContainer : m3Color.onSurfaceVariant,
          }}
        >
          {label}
        </Text>
      </View>
    </SpringPressable>
  );
}

/**
 * Trend badge — uses M3 success / error containers for tonal hierarchy.
 */
function TrendChip({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: m3Shape.full,
          backgroundColor: m3Color.surfaceContainerHigh,
        }}
      >
        <Text style={{ ...m3Type.labelMediumEmphasized, color: m3Color.onSurfaceVariant }}>
          {"\u2014"}
        </Text>
      </View>
    );
  }
  const positive = pct >= 0;
  const bg = positive ? m3Color.successContainer : m3Color.errorContainer;
  const fg = positive ? m3Color.onSuccessContainer : m3Color.onErrorContainer;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: m3Shape.full,
        backgroundColor: bg,
      }}
    >
      <FontAwesome
        name={positive ? "arrow-up" : "arrow-down"}
        size={10}
        color={fg}
      />
      <Text style={{ ...m3Type.labelMediumEmphasized, color: fg }}>
        {formatPct(pct)}
      </Text>
    </View>
  );
}

export default function M3HomeScreen() {
  const router = useRouter();
  const [sport, setSport] = useState<string>("");
  const [eraIdx, setEraIdx] = useState(0);
  const [searchText, setSearchText] = useState("");
  const era = ERAS[eraIdx];

  const fadeIn = useRef(new Animated.Value(0)).current;
  useMemo(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeIn]);

  const { data: trending = [], isLoading } = useQuery<MarketMover[]>({
    queryKey: ["trending", sport, era.min, era.max],
    queryFn: () => fetchTrending(sport || undefined, era.min, era.max),
  });

  // Dedupe + filter to cards with a real 7d baseline. Null trend = no
  // historical snapshot yet; excluded from gainer/loser leaderboards.
  const deduped = useMemo(() => {
    const map = new Map<string, MarketMover>();
    for (const c of trending) {
      const existing = map.get(c.searchKey);
      if (!existing || c.numSales > existing.numSales) map.set(c.searchKey, c);
    }
    return Array.from(map.values());
  }, [trending]);
  const withTrend = useMemo(
    () =>
      deduped.filter(
        (c): c is MarketMover & { trend7dPct: number } => c.trend7dPct !== null
      ),
    [deduped]
  );

  const topGainer = useMemo(() => {
    const ranked = withTrend
      .filter((c) => c.trend7dPct > 0)
      .sort((a, b) => b.trend7dPct - a.trend7dPct);
    return ranked[0] ?? null;
  }, [withTrend]);
  const topDecliner = useMemo(() => {
    const ranked = withTrend
      .filter((c) => c.trend7dPct < 0)
      .sort((a, b) => a.trend7dPct - b.trend7dPct);
    return ranked[0] ?? null;
  }, [withTrend]);
  const totalVolume = useMemo(
    () => deduped.reduce((s, c) => s + c.numSales, 0),
    [deduped]
  );
  const avgTrend = useMemo(() => {
    if (withTrend.length === 0) return null;
    return withTrend.reduce((s, c) => s + c.trend7dPct, 0) / withTrend.length;
  }, [withTrend]);

  const sportItems = useMemo(
    () => [
      { value: "", label: "All", emoji: "\uD83C\uDFAF" },
      ...SPORTS.map((s) => ({
        value: s,
        label: SPORT_META[s]?.label ?? s,
        emoji: SPORT_META[s]?.emoji,
      })),
    ],
    []
  );

  const trendingTop5 = useMemo(() => {
    const trendable = deduped.filter((c) => c.trend7dPct !== null);
    const pool = trendable.length > 0 ? trendable : deduped;
    return pool
      .slice()
      .sort((a, b) => {
        if (a.trend7dPct !== null && b.trend7dPct !== null) {
          return Math.abs(b.trend7dPct) - Math.abs(a.trend7dPct);
        }
        return b.numSales - a.numSales;
      })
      .slice(0, 5);
  }, [deduped]);

  return (
    <View style={{ flex: 1, backgroundColor: m3Color.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: m3Space.lg,
            paddingBottom: m3Space.huge,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top app bar — M3 large variant */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: m3Space.md,
              paddingBottom: m3Space.sm,
            }}
          >
            <SpringPressable onPress={() => router.back()} scaleTo={0.88}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: m3Shape.full,
                  backgroundColor: m3Color.surfaceContainerHigh,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="arrow-left" size={16} color={m3Color.onSurface} />
              </View>
            </SpringPressable>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: m3Shape.full,
                backgroundColor: m3Color.tertiaryContainer,
              }}
            >
              <Text style={{ fontSize: 12 }}>{"\u2728"}</Text>
              <Text
                style={{
                  ...m3Type.labelMediumEmphasized,
                  color: m3Color.onTertiaryContainer,
                }}
              >
                M3 EXPRESSIVE
              </Text>
            </View>
            <SpringPressable onPress={() => router.push("/(tabs)/profile")} scaleTo={0.88}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: m3Shape.full,
                  backgroundColor: m3Color.primaryContainer,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="user" size={16} color={m3Color.onPrimaryContainer} />
              </View>
            </SpringPressable>
          </View>

          {/* Hero greeting — emphasized typography (tactic #3 + #7) */}
          <Animated.View style={{ opacity: fadeIn, marginTop: m3Space.lg }}>
            <Text
              style={{
                ...m3Type.labelLargeEmphasized,
                color: m3Color.primary,
                textTransform: "uppercase",
              }}
            >
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </Text>
            <Text
              style={{
                ...m3Type.displayMediumEmphasized,
                color: m3Color.onSurface,
                marginTop: m3Space.xs,
              }}
            >
              Market{"\n"}Pulse.
            </Text>
            <Text
              style={{
                ...m3Type.bodyLarge,
                color: m3Color.onSurfaceVariant,
                marginTop: m3Space.sm,
              }}
            >
              Where sports cards are moving today.
            </Text>
          </Animated.View>

          {/* Search — filled-tonal text field with leading icon */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: m3Color.surfaceContainerHighest,
              borderRadius: m3Shape.full,
              marginTop: m3Space.lg,
              paddingHorizontal: m3Space.lg,
              gap: m3Space.sm,
            }}
          >
            <FontAwesome name="search" size={16} color={m3Color.onSurfaceVariant} />
            <TextInput
              placeholder="Search players, sets, years..."
              placeholderTextColor={m3Color.onSurfaceVariant}
              value={searchText}
              onChangeText={setSearchText}
              style={{
                flex: 1,
                paddingVertical: 14,
                ...m3Type.bodyLarge,
                color: m3Color.onSurface,
              }}
            />
          </View>

          {/* Era chips — varied shape (rounded vs squircle) on selection */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: m3Space.lg, marginHorizontal: -m3Space.lg }}
            contentContainerStyle={{ paddingHorizontal: m3Space.lg, gap: m3Space.sm }}
          >
            {ERAS.map((e, i) => (
              <FilterChip
                key={e.label}
                label={e.label}
                active={eraIdx === i}
                onPress={() => setEraIdx(i)}
              />
            ))}
          </ScrollView>

          {/* Sport button group — flagship M3 Expressive component */}
          <View style={{ marginTop: m3Space.md }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -m3Space.lg }}
              contentContainerStyle={{ paddingHorizontal: m3Space.lg, gap: 4, minWidth: "100%" }}
            >
              <ButtonGroup items={sportItems} value={sport} onChange={setSport} />
            </ScrollView>
          </View>

          {isLoading && (
            <View style={{ alignItems: "center", paddingVertical: m3Space.huge }}>
              <ActivityIndicator size="large" color={m3Color.primary} />
            </View>
          )}

          {/* HERO MOMENT — combines all 7 tactics on the top gainer */}
          {topGainer && (
            <SpringPressable
              onPress={() => router.push(`/card/${topGainer.searchKey}`)}
              spring={m3Motion.springExpressive}
              scaleTo={0.98}
              style={{ marginTop: m3Space.xxl }}
            >
              <View
                style={{
                  backgroundColor: m3Color.primary,
                  borderRadius: m3Shape.xxxl,
                  padding: m3Space.xxl,
                  overflow: "hidden",
                  ...m3Elevation.level3,
                }}
              >
                {/* Decorative shape — tactic #1 */}
                <View
                  style={{
                    position: "absolute",
                    top: -30,
                    right: -30,
                    opacity: 0.18,
                  }}
                >
                  <SoftBurst size={180} color={m3Color.onPrimary} />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: m3Space.sm,
                  }}
                >
                  <FourPointStar size={18} color={m3Color.tertiaryContainer} />
                  <Text
                    style={{
                      ...m3Type.labelLargeEmphasized,
                      color: m3Color.tertiaryContainer,
                      textTransform: "uppercase",
                    }}
                  >
                    Hottest Right Now
                  </Text>
                </View>

                <View style={{ flexDirection: "row", marginTop: m3Space.lg, gap: m3Space.lg }}>
                  <View
                    style={{
                      borderRadius: m3Shape.xl,
                      overflow: "hidden",
                      ...m3Elevation.level2,
                    }}
                  >
                    <CardImage
                      imageUrl={topGainer.imageUrl}
                      playerName={topGainer.playerName}
                      setName={topGainer.setName}
                      year={topGainer.year}
                      width={96}
                      height={134}
                      borderRadius={m3Shape.xl}
                    />
                  </View>
                  <View style={{ flex: 1, justifyContent: "space-between" }}>
                    <View>
                      <Text
                        style={{
                          ...m3Type.headlineSmallEmphasized,
                          color: m3Color.onPrimary,
                        }}
                        numberOfLines={2}
                      >
                        {topGainer.playerName}
                      </Text>
                      <Text
                        style={{
                          ...m3Type.bodyMedium,
                          color: m3Color.onPrimary,
                          opacity: 0.85,
                          marginTop: 4,
                        }}
                        numberOfLines={1}
                      >
                        {topGainer.setName} {topGainer.year ? `\u00B7 ${topGainer.year}` : ""}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={{
                          ...m3Type.displaySmallEmphasized,
                          color: m3Color.onPrimary,
                        }}
                      >
                        {formatCents(topGainer.avgPriceCents)}
                      </Text>
                      <View style={{ flexDirection: "row", marginTop: m3Space.xs }}>
                        <TrendChip pct={topGainer.trend7dPct} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </SpringPressable>
          )}

          {/* Stats strip — contained content in surface container scale (#4) */}
          <View
            style={{
              flexDirection: "row",
              gap: m3Space.md,
              marginTop: m3Space.lg,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: m3Color.surfaceContainer,
                borderRadius: m3Shape.xxl,
                padding: m3Space.lg,
              }}
            >
              <Text
                style={{
                  ...m3Type.labelLargeEmphasized,
                  color: m3Color.onSurfaceVariant,
                  textTransform: "uppercase",
                }}
              >
                Tracked
              </Text>
              <Text
                style={{
                  ...m3Type.displaySmallEmphasized,
                  color: m3Color.onSurface,
                  marginTop: 4,
                }}
              >
                {trending.length}
              </Text>
              <Text
                style={{
                  ...m3Type.bodySmall,
                  color: m3Color.onSurfaceVariant,
                  marginTop: 2,
                }}
              >
                cards with sales
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: m3Color.secondaryContainer,
                borderRadius: m3Shape.xxl,
                padding: m3Space.lg,
              }}
            >
              <Text
                style={{
                  ...m3Type.labelLargeEmphasized,
                  color: m3Color.onSecondaryContainer,
                  textTransform: "uppercase",
                }}
              >
                Avg Move
              </Text>
              <Text
                style={{
                  ...m3Type.displaySmallEmphasized,
                  color: m3Color.onSecondaryContainer,
                  marginTop: 4,
                }}
              >
                {avgTrend !== null ? formatPct(avgTrend) : "\u2014"}
              </Text>
              <Text
                style={{
                  ...m3Type.bodySmall,
                  color: m3Color.onSecondaryContainer,
                  marginTop: 2,
                }}
              >
                {totalVolume.toLocaleString()} sales · 7d
              </Text>
            </View>
          </View>

          {/* Biggest drop — tonal "error container" callout */}
          {topDecliner && topDecliner.trend7dPct < 0 && (
            <SpringPressable
              onPress={() => router.push(`/card/${topDecliner.searchKey}`)}
              style={{ marginTop: m3Space.md }}
            >
              <View
                style={{
                  backgroundColor: m3Color.errorContainer,
                  borderRadius: m3Shape.xxl,
                  padding: m3Space.lg,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: m3Space.md,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: m3Shape.full,
                    backgroundColor: m3Color.error,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FontAwesome name="arrow-down" size={16} color={m3Color.onError} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      ...m3Type.labelMediumEmphasized,
                      color: m3Color.onErrorContainer,
                      textTransform: "uppercase",
                      opacity: 0.7,
                    }}
                  >
                    Biggest Drop
                  </Text>
                  <Text
                    style={{
                      ...m3Type.titleLargeEmphasized,
                      color: m3Color.onErrorContainer,
                    }}
                    numberOfLines={1}
                  >
                    {topDecliner.playerName}
                  </Text>
                </View>
                <TrendChip pct={topDecliner.trend7dPct} />
              </View>
            </SpringPressable>
          )}

          {/* Trending list — top 5 in tonal cards with mixed shape rhythm */}
          <View style={{ marginTop: m3Space.xxl }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: m3Space.md,
              }}
            >
              <Text
                style={{
                  ...m3Type.headlineSmallEmphasized,
                  color: m3Color.onSurface,
                }}
              >
                Top Movers
              </Text>
              <Text
                style={{
                  ...m3Type.labelLargeEmphasized,
                  color: m3Color.primary,
                }}
              >
                See all
              </Text>
            </View>

            {trendingTop5.map((card, i) => {
              // Alternate corner radius to create shape rhythm — tactic #1
              const cornerStyle =
                i % 2 === 0
                  ? { borderRadius: m3Shape.xxl }
                  : {
                      borderTopLeftRadius: m3Shape.xxxl,
                      borderTopRightRadius: m3Shape.md,
                      borderBottomLeftRadius: m3Shape.md,
                      borderBottomRightRadius: m3Shape.xxxl,
                    };
              return (
                <SpringPressable
                  key={card.searchKey}
                  onPress={() => router.push(`/card/${card.searchKey}`)}
                  scaleTo={0.97}
                  style={{ marginBottom: m3Space.md }}
                >
                  <View
                    style={{
                      backgroundColor:
                        i === 0 ? m3Color.surfaceContainerHigh : m3Color.surfaceContainerLow,
                      padding: m3Space.md,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: m3Space.md,
                      ...cornerStyle,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: i === 0 ? m3Shape.sm : m3Shape.full,
                        backgroundColor:
                          i === 0 ? m3Color.tertiary : m3Color.surfaceContainerHighest,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          ...m3Type.labelLargeEmphasized,
                          color: i === 0 ? m3Color.onTertiary : m3Color.onSurfaceVariant,
                        }}
                      >
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
                      borderRadius={m3Shape.md}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          ...m3Type.titleMediumEmphasized,
                          color: m3Color.onSurface,
                        }}
                        numberOfLines={1}
                      >
                        {card.playerName}
                      </Text>
                      <Text
                        style={{
                          ...m3Type.bodySmall,
                          color: m3Color.onSurfaceVariant,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {card.setName} {card.year ? `\u00B7 ${card.year}` : ""}
                      </Text>
                      <Text
                        style={{
                          ...m3Type.titleLargeEmphasized,
                          color: m3Color.onSurface,
                          marginTop: 4,
                        }}
                      >
                        {formatCents(card.avgPriceCents)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <TrendChip pct={card.trend7dPct} />
                      <Text
                        style={{
                          ...m3Type.labelSmall,
                          color: m3Color.onSurfaceVariant,
                        }}
                      >
                        {card.numSales} sales
                      </Text>
                    </View>
                  </View>
                </SpringPressable>
              );
            })}
          </View>

          <Text
            style={{
              ...m3Type.bodySmall,
              color: m3Color.onSurfaceVariant,
              textAlign: "center",
              marginTop: m3Space.xl,
            }}
          >
            Prices from eBay sold listings
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
