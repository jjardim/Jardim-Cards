import { View, Text } from "react-native";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";
import type { MarketMover } from "@/lib/types";

interface SportMixProps {
  cards: MarketMover[];
}

/**
 * Shows what share each sport makes up of the current filtered trending set,
 * as thin color-coded progress bars (inspired by the "Developed Areas" pattern).
 */
export function SportMix({ cards }: SportMixProps) {
  if (cards.length === 0) return null;

  const counts = new Map<string, number>();
  for (const c of cards) {
    const k = (c.sport ?? "other").toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const total = cards.length;
  const rows = Array.from(counts.entries())
    .map(([sport, count]) => ({ sport, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  if (rows.length <= 1) return null;

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        padding: 18,
        marginTop: 16,
        ...shadow.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Text style={{ fontSize: 18 }}>{"\uD83C\uDFC6"}</Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: palette.text, letterSpacing: -0.2 }}>
          Trending Mix
        </Text>
        <Text style={{ fontSize: 11, color: palette.textSubtle, marginLeft: "auto" }}>
          {total} cards
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {rows.map((row) => {
          const theme = getSportTheme(row.sport);
          return (
            <View key={row.sport}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 13 }}>{theme.emoji}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: palette.text }}>
                    {theme.label}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: palette.textMuted }}>
                  {row.pct.toFixed(0)}%
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: palette.bgMuted,
                  borderRadius: radius.pill,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.max(row.pct, 2)}%`,
                    height: "100%",
                    backgroundColor: theme.color,
                    borderRadius: radius.pill,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
