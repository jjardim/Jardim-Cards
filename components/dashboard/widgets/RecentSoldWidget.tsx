import { RecentSoldFeed } from "@/components/RecentSoldFeed";
import { useDashboardContext } from "@/lib/dashboard/dashboard-context";
import type { WidgetComponentProps } from "@/lib/dashboard/types";

export function RecentSoldWidget(_props: WidgetComponentProps) {
  const { filters, era } = useDashboardContext();
  return (
    <RecentSoldFeed sport={filters.sport || undefined} yearMin={era.min} yearMax={era.max} />
  );
}
