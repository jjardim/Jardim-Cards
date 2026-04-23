import { View, Text } from "react-native";
import { formatPct, trendColor } from "@/lib/utils";
import { palette, radius } from "@/lib/theme";

interface TrendBadgeProps {
  pct: number | null;
  size?: "sm" | "md";
}

const COLORS = {
  green: { bg: palette.successBg, text: palette.success },
  red: { bg: palette.dangerBg, text: palette.danger },
  gray: { bg: palette.bgMuted, text: palette.textSubtle },
};

export function TrendBadge({ pct, size = "sm" }: TrendBadgeProps) {
  const color = trendColor(pct);
  const scheme = COLORS[color];
  const arrow = pct !== null ? (pct >= 0 ? "\u2191" : "\u2193") : "";
  const isMd = size === "md";

  return (
    <View
      style={{
        backgroundColor: scheme.bg,
        borderRadius: radius.pill,
        paddingHorizontal: isMd ? 10 : 8,
        paddingVertical: isMd ? 4 : 2,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: scheme.text,
          fontSize: isMd ? 13 : 12,
          fontWeight: "700",
        }}
      >
        {arrow} {formatPct(pct)}
      </Text>
    </View>
  );
}
