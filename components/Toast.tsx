import { useEffect, useRef, useCallback } from "react";
import { Animated, Text, View, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export interface ToastMessage {
  id: string;
  text: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const COLORS = {
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", icon: "check-circle" as const },
  error: { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", icon: "exclamation-circle" as const },
  info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", icon: "info-circle" as const },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const { type = "success", duration = 3500 } = toast;
  const colors = COLORS[type];

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  }, [opacity, translateY, toast.id, onDismiss]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [opacity, translateY, duration, dismiss]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        marginBottom: 8,
      }}
    >
      <TouchableOpacity
        onPress={dismiss}
        activeOpacity={0.8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <FontAwesome name={colors.icon} size={18} color={colors.text} />
        <Text style={{ flex: 1, fontSize: 14, color: colors.text, fontWeight: "500" }}>
          {toast.text}
        </Text>
        <FontAwesome name="times" size={12} color={colors.text} />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 60,
        left: 16,
        right: 16,
        zIndex: 9999,
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}
