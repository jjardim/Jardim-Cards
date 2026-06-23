import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CustomizeDashboardModal } from "@/components/dashboard/CustomizeDashboardModal";
import {
  DashboardProvider,
  useDashboardContext,
} from "@/lib/dashboard/dashboard-context";
import {
  DASHBOARD_ERAS,
  DASHBOARD_PRICE_TIERS,
} from "@/lib/dashboard/filters";
import { useDashboardLayout } from "@/lib/dashboard/use-dashboard-layout";
import { useDashboardRefresh } from "@/lib/dashboard/use-dashboard-refresh";
import { SPORTS } from "@/lib/types";
import { palette, radius, shadow, getSportTheme } from "@/lib/theme";

function FilterPill({
  label,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  active: boolean;
  activeColor?: string;
  onPress: () => void;
}) {
  const bg = active ? activeColor ?? palette.heroDark : palette.surface;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: bg,
        ...(active ? shadow.sm : {}),
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: active ? "700" : "600",
          color: active ? palette.textInverse : palette.textMuted,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DashboardScreenContent() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const { filters, setFilters } = useDashboardContext();
  const { widgetOrder } = useDashboardLayout();
  const { refresh, refreshing, resetKey } = useDashboardRefresh(widgetOrder);

  const sportTheme = getSportTheme(filters.sport);

  const handleSearch = () => {
    const q = searchText.trim();
    if (q) router.push("/(tabs)/search");
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.bg }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={palette.primary}
          />
        }
      >
        <View style={{ padding: 16, paddingBottom: 32 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: palette.textMuted, fontWeight: "500" }}>
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "700",
                  color: palette.text,
                  letterSpacing: -0.8,
                  marginTop: 4,
                }}
              >
                Market Pulse
              </Text>
              <Text style={{ fontSize: 14, color: palette.textMuted, marginTop: 2 }}>
                Where sports cards are moving today
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setCustomizeOpen(true)}
                activeOpacity={0.7}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  backgroundColor: palette.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  ...shadow.sm,
                }}
              >
                <FontAwesome name="th-large" size={16} color={palette.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/profile")}
                activeOpacity={0.7}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.pill,
                  backgroundColor: palette.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  ...shadow.sm,
                }}
              >
                <FontAwesome name="user" size={18} color={palette.text} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/m3-home")}
            activeOpacity={0.7}
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radius.pill,
              backgroundColor: palette.purpleBg,
            }}
          >
            <Text style={{ fontSize: 11 }}>{"\u2728"}</Text>
            <Text
              style={{ fontSize: 11, fontWeight: "700", color: palette.purple, letterSpacing: 0.3 }}
            >
              TRY M3 EXPRESSIVE PREVIEW
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: palette.surface,
              borderRadius: radius.pill,
              marginTop: 16,
              paddingHorizontal: 16,
              ...shadow.sm,
            }}
          >
            <FontAwesome name="search" size={14} color={palette.textSubtle} />
            <TextInput
              placeholder="Search players, sets, years..."
              placeholderTextColor={palette.textSubtle}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 10,
                fontSize: 14,
                color: palette.text,
              }}
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchText("")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome name="times-circle" size={16} color={palette.textSubtle} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { label: "All", value: "", emoji: "\uD83C\uDFAF" },
                ...SPORTS.map((s) => {
                  const t = getSportTheme(s);
                  return { label: t.label, value: s, emoji: t.emoji };
                }),
              ].map((item) => {
                const active = filters.sport === item.value;
                const t = getSportTheme(item.value);
                return (
                  <TouchableOpacity
                    key={item.value || "all"}
                    onPress={() => setFilters((prev) => ({ ...prev, sport: item.value }))}
                    activeOpacity={0.7}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: radius.pill,
                      backgroundColor: active ? t.color : palette.surface,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      ...(active ? shadow.sm : {}),
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>{item.emoji}</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: active ? "700" : "600",
                        color: active ? palette.textInverse : palette.textMuted,
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {DASHBOARD_ERAS.map((e, i) => (
                <FilterPill
                  key={e.label}
                  label={e.label}
                  active={filters.eraIdx === i}
                  onPress={() => setFilters((prev) => ({ ...prev, eraIdx: i }))}
                />
              ))}
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {DASHBOARD_PRICE_TIERS.map((t, i) => (
                <FilterPill
                  key={t.label}
                  label={`${t.label}${"sublabel" in t ? ` ${t.sublabel}` : ""}`}
                  active={filters.tierIdx === i}
                  activeColor={palette.purple}
                  onPress={() => setFilters((prev) => ({ ...prev, tierIdx: i }))}
                />
              ))}
            </View>
          </ScrollView>

          <DashboardShell resetKey={resetKey} />

          <Text
            style={{
              textAlign: "center",
              fontSize: 11,
              color: palette.textSubtle,
              marginTop: 20,
              marginBottom: 8,
            }}
          >
            Pull down to refresh · {sportTheme.label} filters apply to market widgets
          </Text>
          <Text
            style={{
              textAlign: "center",
              fontSize: 11,
              color: palette.textSubtle,
              marginBottom: 32,
            }}
          >
            Prices from eBay sold listings
          </Text>
        </View>
      </ScrollView>

      <CustomizeDashboardModal visible={customizeOpen} onClose={() => setCustomizeOpen(false)} />
    </>
  );
}

export default function DashboardScreen() {
  return (
    <DashboardProvider>
      <DashboardScreenContent />
    </DashboardProvider>
  );
}
