import { View, Text, TouchableOpacity } from "react-native";
import { formatPct, trendColor } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  trend?: number | null;
  subtitle?: string;
  onPress?: () => void;
}

const TREND_COLORS = { green: "#10b981", red: "#ef4444", gray: "#a1a1aa" };

export function StatCard({ label, value, trend, subtitle, onPress }: StatCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e4e4e7",
      }}
    >
      <Text style={{ fontSize: 13, color: "#71717a", fontWeight: "500" }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 6 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#18181b" }} numberOfLines={1}>{value}</Text>
        {trend !== undefined && trend !== null && (
          <Text style={{ fontSize: 13, fontWeight: "600", color: TREND_COLORS[trendColor(trend)] }}>
            {formatPct(trend)}
          </Text>
        )}
      </View>
      {subtitle && (
        <Text style={{ fontSize: 12, color: "#a1a1aa", marginTop: 4 }}>{subtitle}</Text>
      )}
    </Wrapper>
  );
}
