import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BYPASS_URL = "https://bypass.cgxhub.in";
const SERVICE_KEY = Deno.env.get("BYPASS_SERVICE_KEY")!;

const SELLER_USER_DURATION_DAYS = 30;
const DEFAULT_MONTHLY_CREDITS_REQUIRED = 15;
const POLICY_NOTICE = {
  current_status:
    "The bypass is currently working and safe. However, it may stop working at any time and this cannot be predicted.",
  no_refunds_policy:
    "If the bypass fails, no refunds will be issued. If Garena fully patches the bypass, it will be permanently discontinued with no refunds.",
  ban_risks: [
    { type: "Blacklist", likelihood: "Low" },
    { type: "7-Day Ban", likelihood: "Medium" },
    { type: "30-Day Ban", likelihood: "High" },
    { type: "Permanent Ban", likelihood: "Very Rare" },
  ],
  fix_timeline:
    "If an issue occurs, fixes are usually delivered within 7 to 14 days. If fully patched by Garena, it will be permanently discontinued.",
  use_at_your_own_risk:
    "By using this bypass, users acknowledge they are using it at their own risk, especially on main accounts.",
  recommendation:
    "Use your main account only for legitimate mobile gameplay and use a separate account for bypass usage.",
} as const;

async function getMonthlyCreditsRequired(
  adminClient: ReturnType<typeof createClient>,
): Promise<number> {
  const { data } = await adminClient
    .from("site_settings")
    .select("value,updated_at")
    .eq("key", "seller_user_monthly_credits")
    .order("updated_at", { ascending: false })
    .limit(1);

  const parsed = Number.parseInt(data?.[0]?.value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MONTHLY_CREDITS_REQUIRED;
  }
  return parsed;
}

async function debitCreditsAtomic(
  adminClient: ReturnType<typeof createClient>,
  sellerId: string,
  creditsNeeded: number,
): Promise<{ ok: boolean; newBalance?: number }> {
  const { data: currentSeller, error: fetchErr } = await adminClient
    .from("sellers")
    .select("credit_balance")
    .eq("id", sellerId)
    .single();

  if (fetchErr || !currentSeller) return { ok: false };
  if ((currentSeller.credit_balance ?? 0) < creditsNeeded) return { ok: false };

  const newBalance = (currentSeller.credit_balance ?? 0) - creditsNeeded;
  const { data: updated, error: updateErr } = await adminClient
    .from("sellers")
    .update({ credit_balance: newBalance })
    .eq("id", sellerId)
    .eq("credit_balance", currentSeller.credit_balance)
    .select("credit_balance")
    .single();

  if (updateErr || !updated) return { ok: false };
  return { ok: true, newBalance: updated.credit_balance };
}

async function refundCredits(
  adminClient: ReturnType<typeof createClient>,
  sellerId: string,
  credits: number,
) {
  const { data: currentSeller } = await adminClient
    .from("sellers")
    .select("credit_balance")
    .eq("id", sellerId)
    .single();
  const existing = currentSeller?.credit_balance ?? 0;
  await adminClient
    .from("sellers")
    .update({ credit_balance: existing + credits })
    .eq("id", sellerId);
}

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
    const userId = claimsData.claims.sub as string;

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
    const monthlyCreditsRequired = await getMonthlyCreditsRequired(adminClient);

    const body = req.method === "POST" ? await req.json() : {};
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    let result: Record<string, unknown> = {};

    switch (action) {
      case "list-users": {
        const data = await bypassGet(`/api/service/v3/users/list?seller_id=${seller.id}`);
        result = data;
        break;
      }

      case "policy": {
        result = {
          message: "Policy notice retrieved successfully.",
        };
        break;
      }

      case "add-user": {
        const { username, hwid, duration_days } = body;
        const requestedDays = Number(duration_days ?? SELLER_USER_DURATION_DAYS);
        if (requestedDays !== SELLER_USER_DURATION_DAYS) {
          return new Response(JSON.stringify({ error: `Only ${SELLER_USER_DURATION_DAYS}-day duration is enabled.` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const days = SELLER_USER_DURATION_DAYS;
        const creditsNeeded = monthlyCreditsRequired;

        if (seller.credit_balance < creditsNeeded) {
          return new Response(JSON.stringify({ error: `Not enough credits. Need ${creditsNeeded}, have ${seller.credit_balance}.` }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!username?.trim()) {
          return new Response(JSON.stringify({ error: "Username is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const debit = await debitCreditsAtomic(adminClient, seller.id, creditsNeeded);
        if (!debit.ok) {
          return new Response(JSON.stringify({ error: "Insufficient credits or concurrent update detected. Try again." }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let data: Record<string, unknown>;
        try {
          data = await bypassRequest("/api/service/v3/users/add", {
            username: username.trim().toLowerCase(),
            hwid: hwid?.trim() || "",
            duration_days: days,
            seller_id: seller.id,
          });
        } catch (err) {
          await refundCredits(adminClient, seller.id, creditsNeeded);
          throw err;
        }

        await adminClient.from("credit_transactions").insert({
          seller_id: seller.id,
          amount: -creditsNeeded,
          type: "add_user",
          description: `Added user: ${username.trim().toLowerCase()} (${days}d, ${creditsNeeded} credits)`,
        });

        if (seller.api_key_hash) {
          try {
            await fetch(`${BYPASS_URL}/api/service/keys/deduct-credits`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Service-Key": SERVICE_KEY },
              body: JSON.stringify({ seller_id: seller.id, credits: creditsNeeded }),
            });
          } catch (_) { /* non-critical */ }
        }

        await adminClient.from("api_usage_logs").insert({
          seller_id: seller.id,
          endpoint: "add-user",
          credits_used: creditsNeeded,
          request_body: { username, duration_days: days },
          response_status: 200,
        });

        result = { ...data, credits_used: creditsNeeded, credits_remaining: debit.newBalance };
        break;
      }

      case "extend-user": {
        const { username, duration_days } = body;
        const requestedDays = Number(duration_days ?? SELLER_USER_DURATION_DAYS);
        if (requestedDays !== SELLER_USER_DURATION_DAYS) {
          return new Response(JSON.stringify({ error: `Only ${SELLER_USER_DURATION_DAYS}-day duration is enabled.` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const days = SELLER_USER_DURATION_DAYS;
        const creditsNeeded = monthlyCreditsRequired;

        if (seller.credit_balance < creditsNeeded) {
          return new Response(JSON.stringify({ error: `Not enough credits. Need ${creditsNeeded}, have ${seller.credit_balance}.` }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!username?.trim()) {
          return new Response(JSON.stringify({ error: "Username is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const debit = await debitCreditsAtomic(adminClient, seller.id, creditsNeeded);
        if (!debit.ok) {
          return new Response(JSON.stringify({ error: "Insufficient credits or concurrent update detected. Try again." }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let data: Record<string, unknown>;
        try {
          data = await bypassRequest("/api/service/v3/users/extend", {
            username: username.trim().toLowerCase(),
            duration_days: days,
            seller_id: seller.id,
          });
        } catch (err) {
          await refundCredits(adminClient, seller.id, creditsNeeded);
          throw err;
        }

        await adminClient.from("credit_transactions").insert({
          seller_id: seller.id,
          amount: -creditsNeeded,
          type: "extend_user",
          description: `Extended user: ${username.trim().toLowerCase()} by ${days} days (${creditsNeeded} credits)`,
        });

        if (seller.api_key_hash) {
          try {
            await fetch(`${BYPASS_URL}/api/service/keys/deduct-credits`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Service-Key": SERVICE_KEY },
              body: JSON.stringify({ seller_id: seller.id, credits: creditsNeeded }),
            });
          } catch (_) { /* non-critical */ }
        }

        await adminClient.from("api_usage_logs").insert({
          seller_id: seller.id,
          endpoint: "extend-user",
          credits_used: creditsNeeded,
          request_body: { username, duration_days: days },
          response_status: 200,
        });

        result = { ...data, credits_used: creditsNeeded, credits_remaining: debit.newBalance };
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

        const data = await bypassRequest("/api/service/v3/users/reset-hwid", {
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

        const data = await bypassRequest("/api/service/v3/users/remove", {
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

      case "reduce-user": {
        const { username, duration_days } = body;
        if (!username?.trim()) {
          return new Response(JSON.stringify({ error: "Username is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await bypassRequest("/api/service/v3/users/reduce", {
          username: username.trim().toLowerCase(),
          duration_days: duration_days || 7,
          seller_id: seller.id,
        });

        await adminClient.from("api_usage_logs").insert({
          seller_id: seller.id,
          endpoint: "reduce-user",
          credits_used: 0,
          request_body: { username, duration_days },
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

    return new Response(JSON.stringify({
      ...result,
      monthly_credits_required: monthlyCreditsRequired,
      policy_notice: POLICY_NOTICE,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
