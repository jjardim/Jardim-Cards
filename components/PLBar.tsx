import { View } from "react-native";
import { palette, radius } from "@/lib/theme";

interface PLBarProps {
  /** Percent as a raw number, e.g. 12.4 for +12.4% or -8.2 for -8.2% */
  pct: number | null;
  /** Pct magnitude where the bar becomes "full" (default 50%). */
  scale?: number;
  height?: number;
}

/**
 * Thin colored progress-bar representation of P/L percent.
 * Green fills right from the centre for gains, red fills left for losses.
 * Caps the visible fill at `scale` so runaway gains don't blow out the UI.
 */
export function PLBar({ pct, scale = 50, height = 5 }: PLBarProps) {
  const clamped = pct == null ? 0 : Math.max(-scale, Math.min(scale, pct));
  const fillPct = Math.abs(clamped) / scale;
  const isGain = clamped >= 0;
  const color = pct == null ? palette.textSubtle : isGain ? palette.success : palette.danger;

  return (
    <View
      style={{
        height,
        backgroundColor: palette.bgMuted,
        borderRadius: radius.pill,
        overflow: "hidden",
        flexDirection: "row",
      }}
    >
      {/* Left half (losses) */}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        {!isGain && pct != null && (
          <View
            style={{
              width: `${fillPct * 100}%`,
              backgroundColor: color,
              borderTopLeftRadius: radius.pill,
              borderBottomLeftRadius: radius.pill,
            }}
          />
        )}
      </View>
      {/* Centre marker */}
      <View style={{ width: 1, backgroundColor: palette.borderSoft }} />
      {/* Right half (gains) */}
      <View style={{ flex: 1, flexDirection: "row" }}>
        {isGain && pct != null && (
          <View
            style={{
              width: `${fillPct * 100}%`,
              backgroundColor: color,
              borderTopRightRadius: radius.pill,
              borderBottomRightRadius: radius.pill,
            }}
          />
        )}
      </View>
    </View>
  );
}
