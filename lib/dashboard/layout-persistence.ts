import { supabase } from "@/lib/supabase";
import { DEFAULT_WIDGET_ORDER } from "./registry";
import { isWidgetId, type DashboardLayout, type WidgetId } from "./types";

export async function fetchDashboardLayout(userId: string): Promise<DashboardLayout> {
  const { data, error } = await supabase
    .from("user_dashboard_layout")
    .select("widget_order")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { widgetOrder: DEFAULT_WIDGET_ORDER };
  }

  const saved = data.widget_order.filter(isWidgetId);
  return { widgetOrder: saved.length > 0 ? saved : DEFAULT_WIDGET_ORDER };
}

export async function saveDashboardLayout(
  userId: string,
  widgetOrder: WidgetId[]
): Promise<void> {
  const { error } = await supabase.from("user_dashboard_layout").upsert(
    {
      user_id: userId,
      widget_order: widgetOrder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}

export function getDefaultDashboardLayout(): DashboardLayout {
  return { widgetOrder: DEFAULT_WIDGET_ORDER };
}
