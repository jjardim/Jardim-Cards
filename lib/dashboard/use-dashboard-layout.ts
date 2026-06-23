import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  fetchDashboardLayout,
  getDefaultDashboardLayout,
  saveDashboardLayout,
} from "./layout-persistence";
import { DEFAULT_WIDGET_ORDER } from "./registry";
import type { WidgetId } from "./types";

export function useDashboardLayout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [guestOrder, setGuestOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);

  const { data: layout, isLoading } = useQuery({
    queryKey: ["dashboard-layout", user?.id],
    queryFn: async () => {
      if (!user) return getDefaultDashboardLayout();
      return fetchDashboardLayout(user.id);
    },
    staleTime: 1000 * 60 * 5,
  });

  const saveMutation = useMutation({
    mutationFn: async (widgetOrder: WidgetId[]) => {
      if (!user) return widgetOrder;
      await saveDashboardLayout(user.id, widgetOrder);
      return widgetOrder;
    },
    onSuccess: (widgetOrder) => {
      queryClient.setQueryData(["dashboard-layout", user?.id], { widgetOrder });
    },
  });

  const widgetOrder = user ? (layout?.widgetOrder ?? DEFAULT_WIDGET_ORDER) : guestOrder;

  const setWidgetOrder = useCallback(
    (next: WidgetId[] | ((prev: WidgetId[]) => WidgetId[])) => {
      const resolved = typeof next === "function" ? next(widgetOrder) : next;
      if (user) {
        queryClient.setQueryData(["dashboard-layout", user.id], { widgetOrder: resolved });
        saveMutation.mutate(resolved);
      } else {
        setGuestOrder(resolved);
      }
    },
    [user, widgetOrder, saveMutation, queryClient]
  );

  const toggleWidget = useCallback(
    (id: WidgetId, enabled: boolean) => {
      setWidgetOrder((prev) => {
        if (enabled) {
          if (prev.includes(id)) return prev;
          return [...prev, id];
        }
        return prev.filter((w) => w !== id);
      });
    },
    [setWidgetOrder]
  );

  const moveWidget = useCallback(
    (id: WidgetId, direction: "up" | "down") => {
      setWidgetOrder((prev) => {
        const index = prev.indexOf(id);
        if (index < 0) return prev;
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
    },
    [setWidgetOrder]
  );

  const resetLayout = useCallback(() => {
    setWidgetOrder(DEFAULT_WIDGET_ORDER);
  }, [setWidgetOrder]);

  return useMemo(
    () => ({
      widgetOrder,
      isLoading,
      isSaving: saveMutation.isPending,
      toggleWidget,
      moveWidget,
      resetLayout,
    }),
    [widgetOrder, isLoading, saveMutation.isPending, toggleWidget, moveWidget, resetLayout]
  );
}
