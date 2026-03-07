import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BYPASS_URL = Deno.env.get("BYPASS_API_BASE_URL") || "https://bypass.cgxhub.in";
const RAW_API_KEY_PREFIX = (Deno.env.get("SELLER_API_KEY_PREFIX") || "v3api").trim().toLowerCase();
const API_KEY_PREFIX = RAW_API_KEY_PREFIX.replace(/[^a-z0-9]/g, "") || "v3api";

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get seller record
    let { data: seller, error: sellerErr } = await adminClient
      .from("sellers")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Legacy accounts can have seller role but missing sellers row.
    if (sellerErr || !seller) {
      const { data: hasSellerRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "seller")
        .maybeSingle();

      if (!hasSellerRole) {
        return new Response(JSON.stringify({ error: "Seller account not found. Buy credits first." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: createdSeller, error: createErr } = await adminClient
        .from("sellers")
        .insert({ user_id: userId, status: "active" })
        .select("*")
        .single();

      if (createErr || !createdSeller) {
        return new Response(JSON.stringify({ error: "Failed to initialize seller account" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      seller = createdSeller;
    }

    const SERVICE_KEY = Deno.env.get("BYPASS_SERVICE_KEY");

    // Generate a new API key: configurable prefix + 40 random hex chars
    const randomBytes = new Uint8Array(20);
    crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const apiKey = `${API_KEY_PREFIX}_${randomHex}`;
    const apiKeyPrefix = apiKey.substring(0, 12);

    // Hash the key for storage
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(apiKey)
    );
    const apiKeyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Get seller profile for naming
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", userId)
      .single();

    const keyName = profile?.display_name || profile?.email?.split("@")[0] || seller.id.substring(0, 8);

    // Store hash and prefix in sellers table FIRST (this always works)
    await adminClient
      .from("sellers")
      .update({
        api_key_hash: apiKeyHash,
        api_key_prefix: apiKeyPrefix,
      })
      .eq("id", seller.id);

    // Try to register API key on bypass server (non-blocking)
    let serverSynced = false;
    if (SERVICE_KEY) {
      try {
        const registerResp = await fetch(`${BYPASS_URL}/api/service/keys/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Service-Key": SERVICE_KEY,
          },
          body: JSON.stringify({
            api_key: apiKey,
            seller_id: seller.id,
            key_name: keyName,
            initial_credits: seller.credit_balance,
            expires: "2027-12-31",
          }),
        });
        serverSynced = registerResp.ok;
        if (!registerResp.ok) {
          const errData = await registerResp.text();
          console.error("Bypass server key registration failed (non-fatal):", errData);
        }
      } catch (e: unknown) {
        console.error("Bypass server unreachable (non-fatal):", (e as Error).message);
      }
    } else {
      console.error("BYPASS_SERVICE_KEY is missing; skipping bypass server key sync");
    }

    // Return the FULL key — only shown ONCE
    return new Response(
      JSON.stringify({
        success: true,
        api_key: apiKey,
        prefix: apiKeyPrefix,
        server_synced: serverSynced,
        message: serverSynced
          ? "Save this key now — it won't be shown again!"
          : "Key generated locally. Server sync pending — key will work once server endpoint is available.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("generate-api-key error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
