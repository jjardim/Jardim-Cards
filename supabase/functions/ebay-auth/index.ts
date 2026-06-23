import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EBAY_CLIENT_ID = Deno.env.get("EBAY_CLIENT_ID") ?? "";
const EBAY_CLIENT_SECRET = Deno.env.get("EBAY_CLIENT_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EBAY_SANDBOX = (Deno.env.get("EBAY_SANDBOX") ?? "").toLowerCase() === "true";

const EBAY_AUTH_URL = EBAY_SANDBOX
  ? "https://auth.sandbox.ebay.com/oauth2/authorize"
  : "https://auth.ebay.com/oauth2/authorize";
const EBAY_TOKEN_URL = EBAY_SANDBOX
  ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
  : "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_RUNAME = Deno.env.get("EBAY_RUNAME") ?? "Jason_Jardim-JasonJar-CardTr-parhuho";
const SCOPES = "https://api.ebay.com/oauth/api_scope";

function oauthConfigStatus() {
  const clientId = EBAY_CLIENT_ID.trim();
  const clientSecret = EBAY_CLIENT_SECRET.trim();
  const runame = EBAY_RUNAME.trim();
  return {
    environment: EBAY_SANDBOX ? "sandbox" : "production",
    clientIdSet: clientId.length > 0,
    clientSecretSet: clientSecret.length > 0,
    runameSet: runame.length > 0,
    clientIdSuffix: clientId.length >= 4 ? clientId.slice(-4) : null,
    runame,
    configured: clientId.length > 0 && clientSecret.length > 0 && runame.length > 0,
  };
}

function oauthConfigError(): string | null {
  const status = oauthConfigStatus();
  if (!status.clientIdSet || !status.clientSecretSet) {
    return "eBay OAuth is not configured on the server (missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET in Supabase Edge Function secrets).";
  }
  if (!status.runameSet) {
    return "eBay RuName is not configured (set EBAY_RUNAME in Supabase Edge Function secrets).";
  }
  return null;
}

const EBAY_OAUTH_SETUP = [
  "1. developer.ebay.com → Your App → Application Keys → Production",
  "2. Copy App ID → Supabase secret EBAY_CLIENT_ID",
  "3. Copy Cert ID → Supabase secret EBAY_CLIENT_SECRET",
  "4. User Tokens → Get a Token from eBay → copy RuName → EBAY_RUNAME",
  "5. RuName Auth Accepted URL must point to your ebay-auth-callback function",
  "6. Redeploy ebay-auth + ebay-auth-callback after updating secrets",
].join("\n");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: string } | null> {
  const credentials = btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`);
  const res = await fetch(EBAY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&scope=${encodeURIComponent(SCOPES)}`,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 7200) * 1000).toISOString(),
  };
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

async function buildConnectionStatus(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  tokenRow: {
    ebay_username: string | null;
    connected_at: string | null;
    token_expiry: string;
    refresh_token: string;
    refresh_token_expiry: string | null;
  }
) {
  let needsReconnect = false;
  let accessTokenExpiry = tokenRow.token_expiry;

  if (tokenRow.refresh_token_expiry && new Date(tokenRow.refresh_token_expiry) < new Date()) {
    needsReconnect = true;
  }

  if (!needsReconnect && new Date(tokenRow.token_expiry) < new Date()) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    if (refreshed) {
      accessTokenExpiry = refreshed.expiresAt;
      await adminClient
        .from("ebay_tokens")
        .update({
          access_token: refreshed.accessToken,
          token_expiry: refreshed.expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      needsReconnect = true;
    }
  }

  const refreshTokenExpiry = tokenRow.refresh_token_expiry;
  const daysUntilRefreshExpiry = daysUntil(refreshTokenExpiry);

  return {
    connected: true,
    ebayUsername: tokenRow.ebay_username,
    connectedAt: tokenRow.connected_at,
    tokenExpired: needsReconnect,
    needsReconnect,
    accessTokenExpiry,
    refreshTokenExpiry,
    daysUntilRefreshExpiry,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === "POST") {
      const body = await req.json();
      const { action, supabaseToken, appReturnUrl } = body as {
        action: string;
        supabaseToken?: string;
        appReturnUrl?: string;
      };

      if (action === "check_oauth_config") {
        const configError = oauthConfigError();
        return new Response(
          JSON.stringify({
            ...oauthConfigStatus(),
            error: configError,
            setup_instructions: configError ? EBAY_OAUTH_SETUP : null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "get_consent_url") {
        if (!supabaseToken) {
          return new Response(JSON.stringify({ error: "supabaseToken required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const configError = oauthConfigError();
        if (configError) {
          return new Response(
            JSON.stringify({
              error: configError,
              setup_instructions: EBAY_OAUTH_SETUP,
              ...oauthConfigStatus(),
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const state = btoa(JSON.stringify({
          token: supabaseToken,
          returnUrl: appReturnUrl ?? "",
        }));

        const consentUrl = `${EBAY_AUTH_URL}?client_id=${encodeURIComponent(EBAY_CLIENT_ID.trim())}&redirect_uri=${encodeURIComponent(EBAY_RUNAME.trim())}&response_type=code&scope=${encodeURIComponent(SCOPES)}&state=${encodeURIComponent(state)}`;

        return new Response(JSON.stringify({ consentUrl, ...oauthConfigStatus() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "disconnect") {
        if (!supabaseToken) {
          return new Response(JSON.stringify({ error: "supabaseToken required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user } } = await createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
          global: { headers: { Authorization: `Bearer ${supabaseToken}` } },
        }).auth.getUser();

        if (!user) {
          return new Response(JSON.stringify({ error: "Invalid token" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await adminClient.from("ebay_tokens").delete().eq("user_id", user.id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "status") {
        if (!supabaseToken) {
          return new Response(JSON.stringify({ error: "supabaseToken required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
          global: { headers: { Authorization: `Bearer ${supabaseToken}` } },
        });

        const { data: { user } } = await userClient.auth.getUser();
        if (!user) {
          return new Response(JSON.stringify({ error: "Invalid token" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: tokenRow } = await adminClient
          .from("ebay_tokens")
          .select("ebay_username, connected_at, token_expiry, refresh_token, refresh_token_expiry")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!tokenRow) {
          return new Response(JSON.stringify({
            connected: false,
            ebayUsername: null,
            connectedAt: null,
            tokenExpired: false,
            needsReconnect: false,
            accessTokenExpiry: null,
            refreshTokenExpiry: null,
            daysUntilRefreshExpiry: null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const status = await buildConnectionStatus(adminClient, user.id, tokenRow);

        return new Response(JSON.stringify(status), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
