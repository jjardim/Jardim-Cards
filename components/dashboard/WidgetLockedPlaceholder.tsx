import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { palette, radius, shadow } from "@/lib/theme";

export function WidgetLockedPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const router = useRouter();

  return (
    <View
      style={{
        marginTop: 18,
        padding: 20,
        borderRadius: radius.xl,
        backgroundColor: palette.surface,
        alignItems: "center",
        ...shadow.sm,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: palette.purpleBg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <FontAwesome name="lock" size={16} color={palette.purple} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: "700", color: palette.text }}>{title}</Text>
      <Text style={{ fontSize: 12, color: palette.textSubtle, marginTop: 6, textAlign: "center" }}>
        {description}
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/profile")}
        activeOpacity={0.85}
        style={{
          marginTop: 14,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: radius.pill,
          backgroundColor: palette.primary,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: palette.textInverse }}>
          View Pro options
        </Text>
      </TouchableOpacity>
    </View>
  );
}
