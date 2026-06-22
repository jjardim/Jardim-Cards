import { View, Text } from "react-native";
import type { CompMatchLevel } from "@/lib/types";
import { palette, radius } from "@/lib/theme";

interface CompMatchBadgeProps {
  level: CompMatchLevel;
  label?: string;
  size?: "sm" | "md";
}

const LEVEL_STYLES: Record<
  CompMatchLevel,
  { bg: string; text: string; short: string }
> = {
  exact: { bg: palette.successBg, text: palette.success, short: "Exact" },
  grade: { bg: "#E8F0FE", text: "#1A56DB", short: "Grade" },
  approximate: { bg: palette.warningBg, text: palette.warning, short: "Approx" },
  stale: { bg: palette.bgMuted, text: palette.textSubtle, short: "Stale" },
};

export function CompMatchBadge({ level, label, size = "sm" }: CompMatchBadgeProps) {
  const scheme = LEVEL_STYLES[level];
  const isMd = size === "md";

  return (
    <View
      style={{
        backgroundColor: scheme.bg,
        borderRadius: radius.pill,
        paddingHorizontal: isMd ? 10 : 7,
        paddingVertical: isMd ? 4 : 2,
        maxWidth: "100%",
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: scheme.text,
          fontSize: isMd ? 12 : 10,
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {label ?? scheme.short}
      </Text>
    </View>
  );
}
