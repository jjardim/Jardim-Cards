import { View, Text, TouchableOpacity } from "react-native";
import { formatPct, trendColor } from "@/lib/utils";
import { palette, radius, shadow } from "@/lib/theme";

interface StatCardProps {
  label: string;
  value: string;
  trend?: number | null;
  subtitle?: string;
  onPress?: () => void;
  accent?: string;
  icon?: React.ReactNode;
}

const TREND_COLORS = { green: palette.success, red: palette.danger, gray: palette.textSubtle };

export function StatCard({ label, value, trend, subtitle, onPress, accent, icon }: StatCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={{
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        padding: 16,
        ...shadow.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon && (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: radius.pill,
              backgroundColor: accent ?? palette.primaryBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </View>
        )}
        <Text style={{ fontSize: 12, color: palette.textMuted, fontWeight: "600", letterSpacing: 0.2 }}>
          {label.toUpperCase()}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 10 }}>
        <Text
          style={{ fontSize: 26, fontWeight: "700", color: palette.text, letterSpacing: -0.5 }}
          numberOfLines={1}
        >
          {value}
        </Text>
        {trend !== undefined && trend !== null && (
          <Text
            style={{ fontSize: 13, fontWeight: "700", color: TREND_COLORS[trendColor(trend)] }}
          >
            {formatPct(trend)}
          </Text>
        )}
      </View>
      {subtitle && (
        <Text style={{ fontSize: 12, color: palette.textSubtle, marginTop: 4 }} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </Wrapper>
  );
}
