import { Platform } from "react-native";
import { DEFAULT_WIDGET_ORDER } from "./registry";
import { isWidgetId, type WidgetId } from "./types";

const STORAGE_KEY = "cards-guest-dashboard-layout";

/** Sync read for web guest sessions (localStorage). */
export function loadGuestDashboardLayout(): WidgetId[] {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") {
    return DEFAULT_WIDGET_ORDER;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGET_ORDER;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_WIDGET_ORDER;
    const order = parsed.filter((id): id is WidgetId => typeof id === "string" && isWidgetId(id));
    return order.length > 0 ? order : DEFAULT_WIDGET_ORDER;
  } catch {
    return DEFAULT_WIDGET_ORDER;
  }
}

export function saveGuestDashboardLayout(widgetOrder: WidgetId[]): void {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetOrder));
  } catch {
    // quota / private mode — ignore
  }
}
