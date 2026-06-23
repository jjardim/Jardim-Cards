import { Modal, View, Text, TouchableOpacity, Pressable } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { palette, radius, shadow } from "@/lib/theme";
import { FREE_DAILY_REFRESH_LIMIT } from "@/lib/valuation-refresh";

interface RefreshPaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RefreshPaywallModal({ visible, onClose }: RefreshPaywallModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 360,
            backgroundColor: palette.surface,
            borderRadius: radius.xl,
            padding: 24,
            ...shadow.lg,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.pill,
              backgroundColor: palette.primaryBg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <FontAwesome name="refresh" size={18} color={palette.primary} />
          </View>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: palette.text,
              letterSpacing: -0.4,
            }}
          >
            Today&apos;s updates are used
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: palette.textMuted,
              marginTop: 10,
              lineHeight: 21,
            }}
          >
            {`Free accounts include ${FREE_DAILY_REFRESH_LIMIT} fresh comp pulls per day — enough for a quick portfolio check. Pro unlocks unlimited updates whenever the market moves.`}
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: palette.textSubtle,
              marginTop: 12,
            }}
          >
            Resets at midnight in your timezone.
          </Text>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              marginTop: 22,
              backgroundColor: palette.heroDark,
              borderRadius: radius.pill,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: palette.textInverse, fontWeight: "700", fontSize: 15 }}>
              Got it
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
