import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { AnimatedNumber } from "./AnimatedNumber";
import { formatCents } from "@/lib/utils";
import { fetchPortfolioValuation } from "@/lib/api";
import type { PortfolioValuation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { PortfolioCard } from "@/lib/types";
import { palette, radius, shadow } from "@/lib/theme";

const COLORS = { green: "#4ade80", red: "#fb7185", gray: palette.textInverseMuted } as const;

export function PortfolioWidget() {
  const { user } = useAuth();
  const router = useRouter();

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

  const { data: valuations = {} } = useQuery<Record<string, PortfolioValuation | null>>({
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

  if (!user || cards.length === 0) return null;

  const totalCards = cards.reduce((s, c) => s + c.quantity, 0);
  const totalInvested = cards.reduce((s, c) => s + c.purchase_price_cents * c.quantity, 0);
  const totalCurrentValue = cards.reduce((s, c) => {
    const v = valuations[c.id];
    return s + (v ? v.currentValueCents * c.quantity : 0);
  }, 0);
  const hasValuations = Object.values(valuations).some(Boolean);
  const totalPL = hasValuations ? totalCurrentValue - totalInvested : null;
  const plColor = totalPL !== null ? (totalPL >= 0 ? COLORS.green : COLORS.red) : COLORS.gray;
  const plPct = totalPL !== null && totalInvested > 0 ? (totalPL / totalInvested) * 100 : null;

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
      {/* Decorative glow in the top-right */}
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
        <Text style={{ fontSize: 11, color: palette.textInverseMuted, fontWeight: "600", letterSpacing: 0.4 }}>
          MARKET VALUE
        </Text>
        <AnimatedNumber
          value={hasValuations ? totalCurrentValue : totalInvested}
          formatter={formatCents}
          style={{ fontSize: 34, fontWeight: "700", color: palette.textInverse, marginTop: 4, letterSpacing: -0.8 }}
        />
        {totalPL !== null && (
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: plColor }}>
              {totalPL >= 0 ? "+" : ""}
              {formatCents(totalPL)}
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
