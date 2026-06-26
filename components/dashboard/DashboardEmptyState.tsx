import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { palette, radius, shadow } from "@/lib/theme";

interface DashboardEmptyStateProps {
  onCustomize: () => void;
}

export function DashboardEmptyState({ onCustomize }: DashboardEmptyStateProps) {
  return (
    <View
      style={{
        marginTop: 28,
        paddingVertical: 32,
        paddingHorizontal: 24,
        borderRadius: radius.xl,
        backgroundColor: palette.surface,
        alignItems: "center",
        ...shadow.sm,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: radius.pill,
          backgroundColor: palette.primaryBg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <FontAwesome name="th-large" size={22} color={palette.primary} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: "700", color: palette.text, textAlign: "center" }}>
        Your home is empty
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: palette.textSubtle,
          marginTop: 8,
          textAlign: "center",
          lineHeight: 19,
          maxWidth: 280,
        }}
      >
        Add widgets to track market moves, your portfolio, discover cards, and more.
      </Text>
      <TouchableOpacity
        onPress={onCustomize}
        activeOpacity={0.85}
        style={{
          marginTop: 18,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: radius.pill,
          backgroundColor: palette.primary,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: palette.textInverse }}>
          Customize Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}
