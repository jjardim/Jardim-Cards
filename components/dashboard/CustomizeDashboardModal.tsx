import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Pressable,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useDashboardContext } from "@/lib/dashboard/dashboard-context";
import {
  canUseWidget,
  WIDGET_DEFINITIONS,
  WIDGET_REGISTRY,
} from "@/lib/dashboard/registry";
import { useDashboardLayout } from "@/lib/dashboard/use-dashboard-layout";
import type { WidgetDefinitionMeta } from "@/lib/dashboard/types";
import { palette, radius, shadow } from "@/lib/theme";
import { ReorderableWidgetList } from "./ReorderableWidgetList";

interface CustomizeDashboardModalProps {
  visible: boolean;
  onClose: () => void;
}

interface WidgetRowProps {
  def: WidgetDefinitionMeta;
  enabled: boolean;
  orderIndex?: number;
  totalEnabled?: number;
  proLocked: boolean;
  isSaving: boolean;
  isDragging?: boolean;
  onToggle: (id: WidgetDefinitionMeta["id"], value: boolean) => void;
  /** Applied to the drag zone only — keeps Switch tappable. */
  dragZoneProps?: Record<string, unknown>;
}

function WidgetRow({
  def,
  enabled,
  orderIndex,
  totalEnabled,
  proLocked,
  isSaving,
  isDragging,
  onToggle,
  dragZoneProps,
}: WidgetRowProps) {
  const cardStyle = {
    backgroundColor: isDragging ? palette.primaryBg : palette.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: isDragging ? 1 : 0,
    borderColor: isDragging ? palette.primarySoft : "transparent",
    ...shadow.sm,
  };

  const mainContent = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {enabled && !proLocked && dragZoneProps ? (
          <FontAwesome name="bars" size={16} color={palette.textMuted} />
        ) : (
          <View style={{ width: 16 }} />
        )}

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
      </View>

      {enabled && !proLocked && orderIndex != null && totalEnabled != null && (
        <Text style={{ fontSize: 11, color: palette.textSubtle, marginTop: 10, marginLeft: 26 }}>
          Position {orderIndex + 1} of {totalEnabled} · drag card to reorder
        </Text>
      )}

      {proLocked && (
        <Text style={{ fontSize: 11, color: palette.purple, marginTop: 8, fontWeight: "600", marginLeft: 26 }}>
          Upgrade to Pro to enable this widget
        </Text>
      )}
    </>
  );

  return (
    <View style={cardStyle}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {dragZoneProps ? (
          <Pressable style={{ flex: 1 }} {...dragZoneProps}>
            {mainContent}
          </Pressable>
        ) : (
          <View style={{ flex: 1 }}>{mainContent}</View>
        )}

        <Switch
          value={enabled && !proLocked}
          disabled={proLocked || isSaving}
          onValueChange={(value) => onToggle(def.id, value)}
          trackColor={{ false: palette.borderSoft, true: palette.primarySoft }}
          thumbColor={enabled ? palette.primary : palette.surface}
        />
      </View>
    </View>
  );
}

export function CustomizeDashboardModal({ visible, onClose }: CustomizeDashboardModalProps) {
  const { plan } = useDashboardContext();
  const { widgetOrder, toggleWidget, setWidgetOrder, resetLayout, isSaving } = useDashboardLayout();

  const enabledWidgets = useMemo(
    () =>
      widgetOrder
        .map((id) => WIDGET_REGISTRY[id])
        .filter((def) => canUseWidget(def.tier, plan)),
    [widgetOrder, plan]
  );

  const disabledWidgets = useMemo(() => {
    const enabledSet = new Set(widgetOrder);
    return [...WIDGET_DEFINITIONS]
      .filter((def) => !enabledSet.has(def.id))
      .sort((a, b) => a.defaultOrder - b.defaultOrder);
  }, [widgetOrder]);

  const handleReorder = useCallback(
    (reordered: WidgetDefinitionMeta[]) => {
      setWidgetOrder(reordered.map((def) => def.id));
    },
    [setWidgetOrder]
  );

  const listHeader =
    enabledWidgets.length > 0 ? (
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: palette.textSubtle,
          letterSpacing: 0.4,
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        On your home screen
      </Text>
    ) : null;

  const listFooter = (
    <>
      {disabledWidgets.length > 0 && (
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: palette.textSubtle,
            letterSpacing: 0.4,
            marginTop: enabledWidgets.length > 0 ? 12 : 0,
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          Hidden widgets
        </Text>
      )}
      {disabledWidgets.map((def) => {
        const proLocked = def.tier === "pro" && !canUseWidget(def.tier, plan);
        return (
          <WidgetRow
            key={def.id}
            def={def}
            enabled={false}
            proLocked={proLocked}
            isSaving={isSaving}
            onToggle={toggleWidget}
          />
        );
      })}
    </>
  );

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
            height: "85%",
            backgroundColor: palette.bg,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
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
                Show, hide, and drag to reorder widgets
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close customize home"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name="times" size={20} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <ReorderableWidgetList
            data={enabledWidgets}
            keyExtractor={(item) => item.id}
            onReorder={handleReorder}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            renderItem={({ item, index, isDragging, dragZoneProps }) => (
              <WidgetRow
                def={item}
                enabled
                orderIndex={index}
                totalEnabled={enabledWidgets.length}
                proLocked={false}
                isSaving={isSaving}
                isDragging={isDragging}
                onToggle={toggleWidget}
                dragZoneProps={dragZoneProps}
              />
            )}
          />

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
              accessibilityLabel="Done customizing home"
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
