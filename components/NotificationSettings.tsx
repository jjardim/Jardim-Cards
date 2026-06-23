import { View, Text, Switch, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { palette } from "@/lib/theme";
import type { NotificationPreferences } from "@/lib/types";
import { pushSupportedOnPlatform } from "@/lib/push-notifications";

function AlertToggle({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: palette.borderSoft,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: palette.text }}>{label}</Text>
        <Text style={{ fontSize: 12, color: palette.textMuted, marginTop: 4, lineHeight: 17 }}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: palette.borderSoft, true: palette.primary }}
        thumbColor={palette.surface}
      />
    </View>
  );
}

export function NotificationSettings({
  preferences,
  loading,
  pushStatus,
  onToggle,
  saving,
}: {
  preferences: NotificationPreferences | null;
  loading: boolean;
  pushStatus: "unsupported" | "denied" | "registered" | "idle";
  onToggle: (
    key: keyof Pick<
      NotificationPreferences,
      "daily_digest" | "watchlist_target" | "portfolio_move" | "profit_target"
    >,
    value: boolean
  ) => void;
  saving: boolean;
}) {
  if (loading) {
    return (
      <View style={{ paddingVertical: 24, alignItems: "center" }}>
        <ActivityIndicator color={palette.textSubtle} />
      </View>
    );
  }

  if (!preferences) {
    return (
      <Text style={{ fontSize: 13, color: palette.textMuted }}>
        Could not load notification settings.
      </Text>
    );
  }

  const pushNote = !pushSupportedOnPlatform()
    ? "Push alerts require the iOS or Android app (not available on web yet)."
    : pushStatus === "denied"
      ? "Enable notifications in system Settings to receive alerts."
      : pushStatus === "registered"
        ? "Device registered for push alerts."
        : "Turn on an alert to register this device.";

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <FontAwesome name="bell-o" size={14} color={palette.textMuted} />
        <Text style={{ fontSize: 12, color: palette.textMuted, flex: 1, lineHeight: 17 }}>
          {pushNote}
        </Text>
      </View>

      <AlertToggle
        label="Daily digest"
        description="One push with portfolio P/L vs yesterday (preferred over per-card spam)."
        value={preferences.daily_digest}
        onChange={(v) => onToggle("daily_digest", v)}
        disabled={saving}
      />
      <AlertToggle
        label="Watchlist price hit"
        description="When a watchlist card reaches your target buy price."
        value={preferences.watchlist_target}
        onChange={(v) => onToggle("watchlist_target", v)}
        disabled={saving}
      />
      <AlertToggle
        label="Portfolio move"
        description={`Alert when total value moves ±${preferences.portfolio_move_pct}% in a day.`}
        value={preferences.portfolio_move}
        onChange={(v) => onToggle("portfolio_move", v)}
        disabled={saving}
      />
      <AlertToggle
        label="Profit target hit"
        description={`When a owned card crosses your ${preferences.profit_target_pct}% take-profit target.`}
        value={preferences.profit_target}
        onChange={(v) => onToggle("profit_target", v)}
        disabled={saving}
      />

      {saving && (
        <Text style={{ fontSize: 11, color: palette.textSubtle, marginTop: 10 }}>Saving…</Text>
      )}
    </View>
  );
}
