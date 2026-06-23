import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { NotificationPreferences } from "@/lib/types";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  hasAnyAlertsEnabled,
} from "@/lib/notification-preferences";
import { pushSupportedOnPlatform, registerForPushNotifications } from "@/lib/push-notifications";

export async function fetchNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (data) return data as NotificationPreferences;

  const defaults = {
    user_id: userId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    updated_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("notification_preferences")
    .insert(defaults)
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted as NotificationPreferences;
}

export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<
    Pick<
      NotificationPreferences,
      | "daily_digest"
      | "watchlist_target"
      | "portfolio_move"
      | "profit_target"
      | "portfolio_move_pct"
      | "profit_target_pct"
    >
  >
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
}

export async function syncProfitTargetToNotifications(
  userId: string,
  profitTargetPct: number
): Promise<void> {
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      profit_target_pct: Math.round(profitTargetPct),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export function useNotificationPreferences(userId: string | undefined) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<"unsupported" | "denied" | "registered" | "idle">(
    "idle"
  );

  useEffect(() => {
    if (!userId) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchNotificationPreferences(userId)
      .then(setPreferences)
      .catch(() => setPreferences(null))
      .finally(() => setLoading(false));
  }, [userId]);

  const ensurePushRegistration = useCallback(async () => {
    if (!userId || !preferences) return;
    if (!hasAnyAlertsEnabled(preferences)) {
      setPushStatus("idle");
      return;
    }
    if (!pushSupportedOnPlatform()) {
      setPushStatus("unsupported");
      return;
    }

    try {
      const token = await registerForPushNotifications(userId);
      setPushStatus(token ? "registered" : "denied");
    } catch {
      setPushStatus("denied");
    }
  }, [userId, preferences]);

  const savePreferences = useCallback(
    async (
      updates: Partial<
        Pick<
          NotificationPreferences,
          | "daily_digest"
          | "watchlist_target"
          | "portfolio_move"
          | "profit_target"
          | "portfolio_move_pct"
          | "profit_target_pct"
        >
      >
    ) => {
      if (!userId) return null;
      const next = await updateNotificationPreferences(userId, updates);
      setPreferences(next);
      return next;
    },
    [userId]
  );

  return {
    preferences,
    loading,
    pushStatus,
    ensurePushRegistration,
    savePreferences,
    setPreferences,
  };
}
