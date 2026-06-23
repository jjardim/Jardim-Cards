import { WorthWatchingWidget } from "@/components/WorthWatchingWidget";
import { useDashboardContext } from "@/lib/dashboard/dashboard-context";
import type { WidgetComponentProps } from "@/lib/dashboard/types";

export function DiscoverWidget(_props: WidgetComponentProps) {
  const { era } = useDashboardContext();
  return <WorthWatchingWidget yearMin={era.min} yearMax={era.max} />;
}
