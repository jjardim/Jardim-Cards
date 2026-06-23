import type { NotificationPreferences } from "@/lib/types";

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  "user_id" | "created_at" | "updated_at"
> = {
  daily_digest: true,
  watchlist_target: true,
  portfolio_move: true,
  profit_target: true,
  portfolio_move_pct: 5,
  profit_target_pct: 20,
};

export function hasAnyAlertsEnabled(
  prefs: Pick<
    NotificationPreferences,
    "daily_digest" | "watchlist_target" | "portfolio_move" | "profit_target"
  >
): boolean {
  return (
    prefs.daily_digest ||
    prefs.watchlist_target ||
    prefs.portfolio_move ||
    prefs.profit_target
  );
}
