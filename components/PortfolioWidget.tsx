import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { AnimatedNumber } from "./AnimatedNumber";
import { formatCents, trendColor } from "@/lib/utils";
import { fetchPortfolioValuation } from "@/lib/api";
import type { PortfolioValuation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { PortfolioCard } from "@/lib/types";

const COLORS = { green: "#22c55e", red: "#ef4444", gray: "#a1a1aa" } as const;

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
  const plColor = totalPL !== null
    ? totalPL >= 0 ? COLORS.green : COLORS.red
    : COLORS.gray;
  const plPct = totalPL !== null && totalInvested > 0
    ? (totalPL / totalInvested) * 100
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push("/(tabs)/portfolio")}
      style={{
        backgroundColor: "#18181b",
        borderRadius: 14,
        padding: 16,
        marginTop: 16,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <FontAwesome name="briefcase" size={14} color="#71717a" />
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#a1a1aa" }}>Your Portfolio</Text>
        </View>
        <FontAwesome name="chevron-right" size={12} color="#52525b" />
      </View>

      <View style={{ flexDirection: "row", marginTop: 12, gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: "#71717a", fontWeight: "500" }}>Market Value</Text>
          <AnimatedNumber
            value={hasValuations ? totalCurrentValue : totalInvested}
            formatter={formatCents}
            style={{ fontSize: 20, fontWeight: "700", color: "#fff", marginTop: 2 }}
          />
        </View>

        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 11, color: "#71717a", fontWeight: "500" }}>Cards</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#fff", marginTop: 2 }}>
            {totalCards}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 11, color: "#71717a", fontWeight: "500" }}>P/L</Text>
          {totalPL !== null ? (
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: plColor }}>
                {totalPL >= 0 ? "+" : ""}{formatCents(totalPL)}
              </Text>
              {plPct !== null && (
                <Text style={{ fontSize: 11, fontWeight: "600", color: plColor }}>
                  ({plPct >= 0 ? "+" : ""}{plPct.toFixed(1)}%)
                </Text>
              )}
            </View>
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.gray, marginTop: 2 }}>--</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
