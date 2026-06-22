import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/toast-context";
import { router } from "expo-router";
import { useUserPreferences } from "@/lib/user-preferences-context";
import { TARGET_PROFIT_OPTIONS } from "@/lib/user-preferences";
import { palette, radius } from "@/lib/theme";

import {
  type EbayConnectionStatus,
  EBAY_REFRESH_NOTICE_DAYS,
  EBAY_REFRESH_WARN_DAYS,
  ebayNeedsReconnect,
  formatEbayRefreshCountdown,
} from "@/lib/ebay-connection";

export default function ProfileScreen() {
  const { user, loading, signOut } = useAuth();
  const { showToast } = useToast();
  const { targetProfitPct, setTargetProfitPct } = useUserPreferences();

  const [ebayStatus, setEbayStatus] = useState<EbayConnectionStatus | null>(null);
  const [ebayLoading, setEbayLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [importing, setImporting] = useState(false);

  const checkEbayStatus = useCallback(async () => {
    if (!user) return;
    setEbayLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const { data, error } = await supabase.functions.invoke("ebay-auth", {
        body: { action: "status", supabaseToken: token },
      });

      if (!error && data) {
        setEbayStatus(data as EbayConnectionStatus);
      }
    } catch {
      // Silently fail
    } finally {
      setEbayLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkEbayStatus();
  }, [checkEbayStatus]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "ebay-auth-complete") {
        checkEbayStatus();
        if (event.data.success) {
          showToast("eBay account connected!", "success");
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [checkEbayStatus, showToast]);

  const handleConnectEbay = useCallback(async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        showToast("Please sign in again", "error");
        return;
      }

      const returnUrl = Platform.OS === "web" ? window.location.href : "";
      const { data, error } = await supabase.functions.invoke("ebay-auth", {
        body: {
          action: "get_consent_url",
          supabaseToken: token,
          appReturnUrl: returnUrl,
        },
      });

      if (error || !data) {
        showToast("Failed to start eBay connection", "error");
        return;
      }

      if (data.error) {
        if (data.setup_instructions) {
          showToast("eBay RuName not configured yet. See console for setup steps.", "error", 6000);
          console.log("eBay OAuth Setup Instructions:", data.setup_instructions);
        } else {
          showToast(data.error, "error");
        }
        return;
      }

      if (data.consentUrl) {
        if (Platform.OS === "web") {
          window.open(data.consentUrl, "ebay-auth", "width=600,height=700,scrollbars=yes");
        } else {
          Linking.openURL(data.consentUrl);
        }
      }
    } catch {
      showToast("Failed to connect eBay", "error");
    } finally {
      setConnecting(false);
    }
  }, [user, showToast]);

  const handleDisconnectEbay = useCallback(async () => {
    if (!user) return;

    const doDisconnect = async () => {
      setDisconnecting(true);
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;

        const { error } = await supabase.functions.invoke("ebay-auth", {
          body: { action: "disconnect", supabaseToken: token },
        });

        if (!error) {
          setEbayStatus({
            connected: false,
            ebayUsername: null,
            connectedAt: null,
            tokenExpired: false,
            needsReconnect: false,
            accessTokenExpiry: null,
            refreshTokenExpiry: null,
            daysUntilRefreshExpiry: null,
          });
          showToast("eBay account disconnected", "info");
        }
      } catch {
        showToast("Failed to disconnect", "error");
      } finally {
        setDisconnecting(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Disconnect your eBay account?")) doDisconnect();
    } else {
      const { Alert } = await import("react-native");
      Alert.alert("Disconnect eBay", "Remove your eBay account connection?", [
        { text: "Cancel", style: "cancel" },
        { text: "Disconnect", style: "destructive", onPress: doDisconnect },
      ]);
    }
  }, [user, showToast]);

  const handleImportPurchases = useCallback(async () => {
    if (!user) return;
    setImporting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const { data, error } = await supabase.functions.invoke("ebay-purchases", {
        body: { supabaseToken: token },
      });

      if (error) {
        showToast("Failed to fetch purchases", "error");
        return;
      }

      if (data.error) {
        if (data.reconnect) {
          await checkEbayStatus();
        }
        showToast(data.error, "error");
        return;
      }

      if (data.source === "order_api_unavailable") {
        showToast(
          "eBay Order API isn't available for this account yet. Purchase import requires eBay approval.",
          "info",
          6000
        );
        return;
      }

      if (data.purchases?.length > 0) {
        const cards = data.purchases.map((p: Record<string, unknown>) => ({
          user_id: user.id,
          card_name: p.title as string,
          search_key: null,
          sport: "baseball",
          year: null,
          player_name: (p.title as string).slice(0, 50),
          set_name: null,
          card_number: null,
          grade: null,
          image_url: p.imageUrl as string | null,
          purchase_price_cents: p.priceCents as number,
          purchase_date: (p.purchaseDate as string).split("T")[0],
          quantity: p.quantity as number,
          notes: `Imported from eBay (${p.itemId})`,
        }));

        const { error: insertError } = await supabase
          .from("portfolio_cards")
          .insert(cards);

        if (insertError) {
          showToast(`Import error: ${insertError.message}`, "error");
        } else {
          showToast(`Imported ${cards.length} card${cards.length !== 1 ? "s" : ""} from eBay!`, "success");
        }
      } else {
        showToast("No purchases found to import", "info");
      }
    } catch {
      showToast("Import failed", "error");
    } finally {
      setImporting(false);
    }
  }, [user, showToast, checkEbayStatus]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fafafa" }}>
        <Text style={{ color: "#71717a" }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fafafa" }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#18181b", marginBottom: 8 }}>
          Welcome to CardTracker
        </Text>
        <Text style={{ fontSize: 15, color: "#71717a", textAlign: "center", marginBottom: 24 }}>
          Sign in to save your card collection and track your portfolio value
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={{ backgroundColor: "#18181b", borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14, marginBottom: 12 }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
          <Text style={{ color: "#18181b", fontWeight: "600", fontSize: 15 }}>Create account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ebayReconnect = ebayNeedsReconnect(ebayStatus);
  const refreshDays = ebayStatus?.daysUntilRefreshExpiry ?? null;
  const refreshCountdown = formatEbayRefreshCountdown(refreshDays);
  const showUrgentRefresh =
    !!ebayStatus?.connected &&
    !ebayReconnect &&
    refreshDays !== null &&
    refreshDays <= EBAY_REFRESH_WARN_DAYS;
  const showRefreshNotice =
    !!ebayStatus?.connected &&
    !ebayReconnect &&
    refreshDays !== null &&
    refreshDays > EBAY_REFRESH_WARN_DAYS &&
    refreshDays <= EBAY_REFRESH_NOTICE_DAYS;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#18181b" }}>Profile</Text>

        {/* Account info */}
        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20, marginTop: 20, borderWidth: 1, borderColor: "#e4e4e7" }}>
          <Text style={{ fontSize: 13, color: "#71717a", fontWeight: "500" }}>Email</Text>
          <Text style={{ fontSize: 16, color: "#18181b", marginTop: 4 }}>{user.email}</Text>
        </View>

        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20, marginTop: 10, borderWidth: 1, borderColor: "#e4e4e7" }}>
          <Text style={{ fontSize: 13, color: "#71717a", fontWeight: "500" }}>Account created</Text>
          <Text style={{ fontSize: 16, color: "#18181b", marginTop: 4 }}>
            {new Date(user.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Trading settings */}
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181b", marginTop: 28, marginBottom: 12 }}>
          Trading
        </Text>
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            padding: 20,
            borderWidth: 1,
            borderColor: palette.borderSoft,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: palette.text }}>
            Profit target
          </Text>
          <Text style={{ fontSize: 13, color: palette.textMuted, marginTop: 6, lineHeight: 18 }}>
            Portfolio filters like &quot;Ready to sell&quot; and &quot;Near target&quot; use this take-profit
            percentage vs your cost basis.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {TARGET_PROFIT_OPTIONS.map((pct) => {
              const active = targetProfitPct === pct;
              return (
                <TouchableOpacity
                  key={pct}
                  onPress={() => setTargetProfitPct(pct)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: radius.pill,
                    backgroundColor: active ? palette.heroDark : palette.bgMuted,
                    borderWidth: 1,
                    borderColor: active ? palette.heroDark : palette.borderSoft,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: active ? palette.textInverse : palette.textMuted,
                    }}
                  >
                    {`${pct}%`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 11, color: palette.textSubtle, marginTop: 12 }}>
            {`Ready to sell = unrealized gain ≥ ${targetProfitPct}%. Near target = within 5% below that.`}
          </Text>
        </View>

        {/* eBay Connection */}
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181b", marginTop: 28, marginBottom: 12 }}>
          Integrations
        </Text>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 20,
            borderWidth: 1,
            borderColor: ebayStatus?.connected && !ebayReconnect ? "#bfdbfe" : "#e4e4e7",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor:
                  ebayStatus?.connected && !ebayReconnect ? "#eff6ff" : ebayReconnect ? "#fef9c3" : "#f4f4f5",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <FontAwesome
                name="shopping-cart"
                size={18}
                color={ebayStatus?.connected && !ebayReconnect ? "#2563eb" : ebayReconnect ? "#ca8a04" : "#a1a1aa"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#18181b" }}>eBay</Text>
              {ebayLoading ? (
                <ActivityIndicator size="small" color="#a1a1aa" style={{ marginTop: 4 }} />
              ) : ebayReconnect ? (
                <Text style={{ fontSize: 13, color: palette.danger, marginTop: 2, fontWeight: "600" }}>
                  Re-auth required
                </Text>
              ) : ebayStatus?.connected ? (
                <Text style={{ fontSize: 13, color: "#22c55e", marginTop: 2 }}>
                  Connected{ebayStatus.ebayUsername ? ` as ${ebayStatus.ebayUsername}` : ""}
                </Text>
              ) : (
                <Text style={{ fontSize: 13, color: "#a1a1aa", marginTop: 2 }}>
                  Not connected
                </Text>
              )}
            </View>
            {ebayStatus?.connected && !ebayReconnect && (
              <View
                style={{
                  backgroundColor: "#dcfce7",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <FontAwesome name="check" size={12} color="#16a34a" />
              </View>
            )}
          </View>

          {ebayReconnect && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: palette.warningBg,
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <FontAwesome name="exclamation-triangle" size={12} color={palette.warning} />
              <Text style={{ fontSize: 12, color: "#854d0e", flex: 1, lineHeight: 17 }}>
                eBay access expired or was revoked. Reconnect to import purchases again.
              </Text>
            </View>
          )}

          {showUrgentRefresh && refreshCountdown && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: palette.warningBg,
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <FontAwesome name="clock-o" size={12} color={palette.warning} />
              <Text style={{ fontSize: 12, color: "#854d0e", flex: 1 }}>
                {`${refreshCountdown} — tap Reconnect eBay before import stops working.`}
              </Text>
            </View>
          )}

          {showRefreshNotice && refreshCountdown && (
            <View
              style={{
                backgroundColor: palette.bgMuted,
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 12, color: palette.textMuted }}>
                {`${refreshCountdown}. eBay requires re-consent about every 18 months.`}
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 13, color: "#71717a", lineHeight: 18, marginBottom: 16 }}>
            {ebayStatus?.connected
              ? ebayReconnect
                ? "Your link is saved but eBay will not accept API calls until you sign in again."
                : "Import purchases into your portfolio. Access tokens refresh automatically every ~2 hours."
              : "Connect your eBay account to automatically import card purchases into your portfolio."}
          </Text>

          {ebayStatus?.connected ? (
            <View style={{ gap: 8 }}>
              {ebayReconnect ? (
                <TouchableOpacity
                  onPress={handleConnectEbay}
                  disabled={connecting}
                  style={{
                    backgroundColor: "#2563eb",
                    borderRadius: 10,
                    paddingVertical: 14,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    opacity: connecting ? 0.6 : 1,
                  }}
                >
                  {connecting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <FontAwesome name="refresh" size={14} color="#fff" />
                  )}
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                    {connecting ? "Opening eBay..." : "Reconnect eBay"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleImportPurchases}
                  disabled={importing}
                  style={{
                    backgroundColor: "#18181b",
                    borderRadius: 10,
                    paddingVertical: 14,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    opacity: importing ? 0.6 : 1,
                  }}
                >
                  {importing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <FontAwesome name="download" size={14} color="#fff" />
                  )}
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                    {importing ? "Importing..." : "Import Purchases"}
                  </Text>
                </TouchableOpacity>
              )}

              {ebayStatus.connectedAt && (
                <Text style={{ fontSize: 11, color: "#a1a1aa", textAlign: "center" }}>
                  Linked {new Date(ebayStatus.connectedAt).toLocaleDateString()}
                  {ebayStatus.refreshTokenExpiry && !ebayReconnect
                    ? ` · Re-auth by ${new Date(ebayStatus.refreshTokenExpiry).toLocaleDateString()}`
                    : ""}
                </Text>
              )}

              {!ebayReconnect && refreshDays !== null && refreshDays > EBAY_REFRESH_NOTICE_DAYS && (
                <Text style={{ fontSize: 11, color: palette.textSubtle, textAlign: "center" }}>
                  {`${refreshDays} days until eBay re-auth`}
                </Text>
              )}

              <TouchableOpacity
                onPress={handleDisconnectEbay}
                disabled={disconnecting}
                style={{
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#fecaca",
                  backgroundColor: "#fef2f2",
                  opacity: disconnecting ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 14 }}>
                  {disconnecting ? "Disconnecting..." : "Disconnect eBay"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleConnectEbay}
              disabled={connecting || ebayLoading}
              style={{
                backgroundColor: "#2563eb",
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                opacity: connecting ? 0.6 : 1,
              }}
            >
              {connecting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FontAwesome name="link" size={14} color="#fff" />
              )}
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                {connecting ? "Connecting..." : "Connect eBay Account"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Data source info */}
        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 20, marginTop: 10, borderWidth: 1, borderColor: "#e4e4e7" }}>
          <Text style={{ fontSize: 13, color: "#71717a", fontWeight: "500" }}>Data Source</Text>
          <Text style={{ fontSize: 16, color: "#18181b", marginTop: 4 }}>eBay API (Live)</Text>
          <Text style={{ fontSize: 12, color: "#a1a1aa", marginTop: 4 }}>
            Prices from eBay sold listings and Browse API
          </Text>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={async () => {
            await signOut();
            router.replace("/(tabs)");
          }}
          style={{
            backgroundColor: "#fef2f2",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            marginTop: 24,
            borderWidth: 1,
            borderColor: "#fecaca",
          }}
        >
          <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 16 }}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}
