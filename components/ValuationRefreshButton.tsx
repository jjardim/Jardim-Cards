import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { palette, radius } from "@/lib/theme";
import type { RefreshQuota } from "@/lib/valuation-refresh";

export function ValuationRefreshButton({
  quota,
  loading,
  onPress,
}: {
  quota: RefreshQuota | undefined;
  loading: boolean;
  onPress: () => void;
}) {
  const exhausted = !!quota && !quota.isPro && quota.remaining <= 0;
  const subtitle = quota?.isPro
    ? "Unlimited"
    : quota
      ? `${quota.remaining} left today`
      : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || exhausted}
      activeOpacity={0.85}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        backgroundColor: palette.surface,
        borderRadius: radius.pill,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        opacity: exhausted ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.textSubtle} />
      ) : (
        <FontAwesome name="refresh" size={12} color={palette.primary} />
      )}
      <View>
        <Text style={{ fontSize: 13, fontWeight: "700", color: palette.text }}>Refresh prices</Text>
        {subtitle ? (
          <Text style={{ fontSize: 10, color: palette.textSubtle, marginTop: 1 }}>{subtitle}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
