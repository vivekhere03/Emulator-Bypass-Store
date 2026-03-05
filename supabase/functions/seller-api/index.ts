import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BYPASS_URL = "https://bypass.cgxhub.in";
const SERVICE_KEY = Deno.env.get("BYPASS_SERVICE_KEY")!;

// Helper: call the bypass server service endpoint
async function bypassRequest(path: string, body: Record<string, unknown>) {
  const resp = await fetch(`${BYPASS_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.detail || `Server error ${resp.status}`);
  }
  return data;
}

async function bypassGet(path: string) {
  const resp = await fetch(`${BYPASS_URL}${path}`, {
    method: "GET",
    headers: { "X-Service-Key": SERVICE_KEY },
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.detail || `Server error ${resp.status}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Get seller record
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: seller, error: sellerErr } = await adminClient
      .from("sellers")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (sellerErr || !seller) {
      return new Response(JSON.stringify({ error: "Seller account not found. Buy credits first." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json() : {};
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    let result: Record<string, unknown> = {};

    switch (action) {
      case "list-users": {
        // List users managed by this seller from bypass server
        const data = await bypassGet(`/api/service/users/list?seller_id=${seller.id}`);
        result = data;
        break;
      }

      case "add-user": {
        if (seller.credit_balance < 1) {
          return new Response(JSON.stringify({ error: "No credits remaining. Buy more credits." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { username, hwid, duration_days } = body;
        if (!username?.trim()) {
          return new Response(JSON.stringify({ error: "Username is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Call bypass server
        const data = await bypassRequest("/api/service/users/add", {
          username: username.trim().toLowerCase(),
          hwid: hwid?.trim() || "",
          duration_days: duration_days || 7,
          seller_id: seller.id,
        });

        // Deduct credit on portal
        await adminClient
          .from("sellers")
          .update({ credit_balance: seller.credit_balance - 1 })
          .eq("id", seller.id);

        // Log transaction
        await adminClient.from("credit_transactions").insert({
          seller_id: seller.id,
          amount: -1,
          type: "add_user",
          description: `Added user: ${username.trim().toLowerCase()}`,
        });

        // Sync deduction to bypass server API key
        if (seller.api_key_hash) {
          try {
            await fetch(`${BYPASS_URL}/api/service/keys/deduct-credits`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Service-Key": SERVICE_KEY },
              body: JSON.stringify({ seller_id: seller.id, credits: 1 }),
            });
          } catch (_) { /* non-critical */ }
        }

        // Log API usage
        await adminClient.from("api_usage_logs").insert({
          seller_id: seller.id,
          endpoint: "add-user",
          credits_used: 1,
          request_body: { username, duration_days },
          response_status: 200,
        });

        result = { ...data, credits_remaining: seller.credit_balance - 1 };
        break;
      }

      case "extend-user": {
        if (seller.credit_balance < 1) {
          return new Response(JSON.stringify({ error: "No credits remaining." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { username, duration_days } = body;
        if (!username?.trim()) {
          return new Response(JSON.stringify({ error: "Username is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await bypassRequest("/api/service/users/extend", {
          username: username.trim().toLowerCase(),
          duration_days: duration_days || 7,
          seller_id: seller.id,
        });

        await adminClient
          .from("sellers")
          .update({ credit_balance: seller.credit_balance - 1 })
          .eq("id", seller.id);

        await adminClient.from("credit_transactions").insert({
          seller_id: seller.id,
          amount: -1,
          type: "extend_user",
          description: `Extended user: ${username.trim().toLowerCase()} by ${duration_days || 7} days`,
        });

        // Sync deduction to bypass server API key
        if (seller.api_key_hash) {
          try {
            await fetch(`${BYPASS_URL}/api/service/keys/deduct-credits`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Service-Key": SERVICE_KEY },
              body: JSON.stringify({ seller_id: seller.id, credits: 1 }),
            });
          } catch (_) { /* non-critical */ }
        }

        await adminClient.from("api_usage_logs").insert({
          seller_id: seller.id,
          endpoint: "extend-user",
          credits_used: 1,
          request_body: { username, duration_days },
          response_status: 200,
        });

        result = { ...data, credits_remaining: seller.credit_balance - 1 };
        break;
      }

      case "reset-hwid": {
        const { username, new_hwid } = body;
        if (!username?.trim()) {
          return new Response(JSON.stringify({ error: "Username is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await bypassRequest("/api/service/users/reset-hwid", {
          username: username.trim().toLowerCase(),
          new_hwid: new_hwid?.trim() || "",
          seller_id: seller.id,
        });

        await adminClient.from("api_usage_logs").insert({
          seller_id: seller.id,
          endpoint: "reset-hwid",
          credits_used: 0,
          request_body: { username },
          response_status: 200,
        });

        result = data;
        break;
      }

      case "remove-user": {
        const { username } = body;
        if (!username?.trim()) {
          return new Response(JSON.stringify({ error: "Username is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await bypassRequest("/api/service/users/remove", {
          username: username.trim().toLowerCase(),
          seller_id: seller.id,
        });

        await adminClient.from("api_usage_logs").insert({
          seller_id: seller.id,
          endpoint: "remove-user",
          credits_used: 0,
          request_body: { username },
          response_status: 200,
        });

        result = data;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
