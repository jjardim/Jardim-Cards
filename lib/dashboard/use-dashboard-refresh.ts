import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardContext } from "./dashboard-context";
import { getWidgetQueryKeys } from "./registry";
import type { WidgetId } from "./types";

export function useDashboardRefresh(enabledWidgetIds: WidgetId[]) {
  const queryClient = useQueryClient();
  const { queryContext } = useDashboardContext();
  const [refreshing, setRefreshing] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const keys = getWidgetQueryKeys(enabledWidgetIds, queryContext);
      await Promise.all(
        keys.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] }))
      );
      setResetKey((k) => k + 1);
    } finally {
      setRefreshing(false);
    }
  }, [enabledWidgetIds, queryContext, queryClient]);

  return { refresh, refreshing, resetKey };
}
