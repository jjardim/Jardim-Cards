import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useDashboardContext } from "@/lib/dashboard/dashboard-context";
import {
  canUseWidget,
  WIDGET_DEFINITIONS,
} from "@/lib/dashboard/registry";
import { useDashboardLayout } from "@/lib/dashboard/use-dashboard-layout";
import { palette, radius, shadow } from "@/lib/theme";

interface CustomizeDashboardModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CustomizeDashboardModal({ visible, onClose }: CustomizeDashboardModalProps) {
  const { plan } = useDashboardContext();
  const { widgetOrder, toggleWidget, moveWidget, resetLayout, isSaving } = useDashboardLayout();

  const sortedDefinitions = [...WIDGET_DEFINITIONS].sort((a, b) => a.defaultOrder - b.defaultOrder);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: palette.bg,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: "85%",
            paddingBottom: 24,
            ...shadow.md,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: palette.borderSoft,
            }}
          >
            <View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: palette.text }}>
                Customize Home
              </Text>
              <Text style={{ fontSize: 12, color: palette.textSubtle, marginTop: 2 }}>
                Show, hide, and reorder dashboard widgets
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome name="times" size={20} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
            {sortedDefinitions.map((def) => {
              const enabled = widgetOrder.includes(def.id);
              const orderIndex = widgetOrder.indexOf(def.id);
              const proLocked = def.tier === "pro" && !canUseWidget(def.tier, plan);

              return (
                <View
                  key={def.id}
                  style={{
                    backgroundColor: palette.surface,
                    borderRadius: radius.lg,
                    padding: 14,
                    ...shadow.sm,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: palette.text }}>
                          {def.title}
                        </Text>
                        {def.tier === "pro" && (
                          <View
                            style={{
                              backgroundColor: palette.purpleBg,
                              borderRadius: radius.pill,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                            }}
                          >
                            <Text style={{ fontSize: 9, fontWeight: "800", color: palette.purple }}>
                              PRO
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: palette.textSubtle, marginTop: 3 }}>
                        {def.description}
                      </Text>
                    </View>
                    <Switch
                      value={enabled && !proLocked}
                      disabled={proLocked || isSaving}
                      onValueChange={(value) => toggleWidget(def.id, value)}
                      trackColor={{ false: palette.borderSoft, true: palette.primarySoft }}
                      thumbColor={enabled ? palette.primary : palette.surface}
                    />
                  </View>

                  {enabled && !proLocked && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 10,
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: palette.borderSoft,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: palette.textSubtle, flex: 1 }}>
                        Position {orderIndex + 1} of {widgetOrder.length}
                      </Text>
                      <TouchableOpacity
                        onPress={() => moveWidget(def.id, "up")}
                        disabled={orderIndex <= 0 || isSaving}
                        style={{
                          padding: 8,
                          borderRadius: radius.pill,
                          backgroundColor: palette.bg,
                          opacity: orderIndex <= 0 ? 0.4 : 1,
                          ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
                        }}
                      >
                        <FontAwesome name="arrow-up" size={12} color={palette.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveWidget(def.id, "down")}
                        disabled={orderIndex >= widgetOrder.length - 1 || isSaving}
                        style={{
                          padding: 8,
                          borderRadius: radius.pill,
                          backgroundColor: palette.bg,
                          opacity: orderIndex >= widgetOrder.length - 1 ? 0.4 : 1,
                          ...(Platform.OS === "web" ? { cursor: "pointer" as const } : {}),
                        }}
                      >
                        <FontAwesome name="arrow-down" size={12} color={palette.textMuted} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {proLocked && (
                    <Text style={{ fontSize: 11, color: palette.purple, marginTop: 8, fontWeight: "600" }}>
                      Upgrade to Pro to enable this widget
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 8,
            }}
          >
            <TouchableOpacity onPress={resetLayout} disabled={isSaving}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: palette.primary }}>
                Reset to defaults
              </Text>
            </TouchableOpacity>
            {isSaving && <ActivityIndicator size="small" color={palette.primary} />}
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: radius.pill,
                backgroundColor: palette.primary,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: palette.textInverse }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
