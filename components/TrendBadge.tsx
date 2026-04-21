import { View, Text } from "react-native";
import { formatPct, trendColor } from "@/lib/utils";

interface TrendBadgeProps {
  pct: number | null;
}

const COLORS = {
  green: { bg: "#ecfdf5", text: "#10b981" },
  red: { bg: "#fef2f2", text: "#ef4444" },
  gray: { bg: "#f4f4f5", text: "#a1a1aa" },
};

export function TrendBadge({ pct }: TrendBadgeProps) {
  const color = trendColor(pct);
  const scheme = COLORS[color];
  const arrow = pct !== null ? (pct >= 0 ? "\u2191" : "\u2193") : "";

  return (
    <View style={{ backgroundColor: scheme.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: scheme.text, fontSize: 12, fontWeight: "600" }}>
        {arrow} {formatPct(pct)}
      </Text>
    </View>
  );
}
