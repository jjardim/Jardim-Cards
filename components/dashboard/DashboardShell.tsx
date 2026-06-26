import { View, ActivityIndicator } from "react-native";
import { useDashboardContext } from "@/lib/dashboard/dashboard-context";
import { canUseWidget, WIDGET_REGISTRY } from "@/lib/dashboard/registry";
import type { WidgetId } from "@/lib/dashboard/types";
import { useDashboardLayout } from "@/lib/dashboard/use-dashboard-layout";
import { palette } from "@/lib/theme";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { WidgetLockedPlaceholder } from "./WidgetLockedPlaceholder";
import { WIDGET_COMPONENTS } from "./widget-components";

interface DashboardShellProps {
  resetKey?: number;
  onCustomize?: () => void;
}

export function DashboardShell({ resetKey = 0, onCustomize }: DashboardShellProps) {
  const { plan } = useDashboardContext();
  const { widgetOrder, isLoading } = useDashboardLayout();

  if (isLoading) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 24 }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (widgetOrder.length === 0) {
    return onCustomize ? <DashboardEmptyState onCustomize={onCustomize} /> : null;
  }

  return (
    <View>
      {widgetOrder.map((id) => (
        <DashboardWidgetSlot key={id} id={id} plan={plan} resetKey={resetKey} />
      ))}
    </View>
  );
}

function DashboardWidgetSlot({
  id,
  plan,
  resetKey,
}: {
  id: WidgetId;
  plan: "free" | "pro";
  resetKey: number;
}) {
  const def = WIDGET_REGISTRY[id];
  const Component = WIDGET_COMPONENTS[id];
  const locked = !canUseWidget(def.tier, plan);

  return (
    <WidgetErrorBoundary key={`${id}-${resetKey}`} title={def.title}>
      {locked ? (
        <WidgetLockedPlaceholder title={def.title} description={def.description} />
      ) : (
        <Component locked={locked} />
      )}
    </WidgetErrorBoundary>
  );
}
