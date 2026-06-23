import { View, ActivityIndicator } from "react-native";
import { useDashboardContext } from "@/lib/dashboard/dashboard-context";
import { canUseWidget, WIDGET_REGISTRY } from "@/lib/dashboard/registry";
import type { WidgetId } from "@/lib/dashboard/types";
import { useDashboardLayout } from "@/lib/dashboard/use-dashboard-layout";
import { palette } from "@/lib/theme";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { WidgetLockedPlaceholder } from "./WidgetLockedPlaceholder";
import { WIDGET_COMPONENTS } from "./widget-components";

export function DashboardShell() {
  const { plan } = useDashboardContext();
  const { widgetOrder, isLoading } = useDashboardLayout();

  if (isLoading) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 24 }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <View>
      {widgetOrder.map((id) => (
        <DashboardWidgetSlot key={id} id={id} plan={plan} />
      ))}
    </View>
  );
}

function DashboardWidgetSlot({ id, plan }: { id: WidgetId; plan: "free" | "pro" }) {
  const def = WIDGET_REGISTRY[id];
  const Component = WIDGET_COMPONENTS[id];
  const locked = !canUseWidget(def.tier, plan);

  return (
    <WidgetErrorBoundary title={def.title}>
      {locked ? (
        <WidgetLockedPlaceholder title={def.title} description={def.description} />
      ) : (
        <Component locked={locked} />
      )}
    </WidgetErrorBoundary>
  );
}
