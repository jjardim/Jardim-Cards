import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EBAY_CLIENT_ID = Deno.env.get("EBAY_CLIENT_ID") ?? "";
const EBAY_CLIENT_SECRET = Deno.env.get("EBAY_CLIENT_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const EBAY_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_RUNAME = Deno.env.get("EBAY_RUNAME") ?? "Jason_Jardim-JasonJar-CardTr-parhuho";
const DEFAULT_REFRESH_SECONDS = 47304000;

function htmlPage(title: string, message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; }
  .card { background: #fff; border-radius: 16px; padding: 40px; max-width: 400px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.08); border: 1px solid #e4e4e7; }
  .icon { font-size: 48px; margin-bottom: 16px; }
  h1 { font-size: 20px; color: #18181b; margin: 0 0 8px; }
  p { font-size: 15px; color: #71717a; margin: 0; line-height: 1.5; }
  .close-hint { margin-top: 20px; font-size: 13px; color: #a1a1aa; }
</style></head><body>
<div class="card">
  <div class="icon">${success ? "\u2705" : "\u274c"}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <p class="close-hint">You can close this window and return to the app.</p>
</div>
<script>if(window.opener){setTimeout(()=>{try{window.opener.postMessage({type:'ebay-auth-complete',success:${success}}, '*')}catch(e){}},500)}</script>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return new Response(
      htmlPage("Connection Failed", errorDescription ?? error, false),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code || !stateParam) {
    return new Response(
      htmlPage("Invalid Request", "Missing authorization code or state parameter.", false),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    let stateData: { token: string; returnUrl?: string };
    try {
      stateData = JSON.parse(atob(stateParam));
    } catch {
      return new Response(
        htmlPage("Invalid State", "Could not decode state parameter.", false),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: `Bearer ${stateData.token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return new Response(
        htmlPage("Authentication Error", "Your session has expired. Please try connecting again from the app.", false),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const credentials = btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`);
    const tokenRes = await fetch(EBAY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(EBAY_RUNAME)}`,
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("eBay token exchange failed:", errText);
      return new Response(
        htmlPage("Token Exchange Failed", "Could not complete the eBay authentication. Please try again.", false),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in ?? 7200;
    const refreshExpiresIn = tokenData.refresh_token_expires_in ?? DEFAULT_REFRESH_SECONDS;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
    const refreshTokenExpiry = new Date(Date.now() + refreshExpiresIn * 1000).toISOString();

    let ebayUsername: string | null = null;
    try {
      const identityRes = await fetch("https://apiz.ebay.com/commerce/identity/v1/user/", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (identityRes.ok) {
        const identity = await identityRes.json();
        ebayUsername = identity.username ?? null;
      }
    } catch {
      // Non-critical
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upsertError } = await adminClient
      .from("ebay_tokens")
      .upsert({
        user_id: user.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: tokenExpiry,
        refresh_token_expiry: refreshTokenExpiry,
        ebay_username: ebayUsername,
        scopes: tokenData.scope ?? "",
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Failed to store tokens:", upsertError);
      return new Response(
        htmlPage("Storage Error", "Connected to eBay but failed to save credentials. Please try again.", false),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const usernameMsg = ebayUsername ? ` as <strong>${ebayUsername}</strong>` : "";
    return new Response(
      htmlPage("eBay Connected!", `Your eBay account${usernameMsg} has been successfully linked to CardTracker.`, true),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Callback error:", message);
    return new Response(
      htmlPage("Error", "An unexpected error occurred. Please try again.", false),
      { headers: { "Content-Type": "text/html" } }
    );
  }
});
