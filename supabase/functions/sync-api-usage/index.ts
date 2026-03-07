import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-service-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceKeyHeader = req.headers.get("X-Service-Key")?.trim() || "";
    const serviceKey = Deno.env.get("BYPASS_SERVICE_KEY")?.trim() || "";

    if (!serviceKey || serviceKeyHeader !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized service call" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const sellerId = String(body?.seller_id || "").trim();
    const endpoint = String(body?.endpoint || "").trim() || "api_key_usage";
    const requestBody = (body?.request_body ?? {}) as Record<string, unknown>;
    const responseStatus = Number.isFinite(Number(body?.response_status))
      ? Number(body.response_status)
      : 200;
    const creditsUsed = Math.max(0, Number.parseInt(String(body?.credits_used ?? 0), 10) || 0);

    if (!sellerId) {
      return new Response(JSON.stringify({ error: "Missing seller_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: seller, error: sellerErr } = await adminClient
      .from("sellers")
      .select("id, credit_balance")
      .eq("id", sellerId)
      .single();

    if (sellerErr || !seller) {
      return new Response(JSON.stringify({ error: "Seller not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let newBalance = seller.credit_balance ?? 0;
    if (creditsUsed > 0) {
      newBalance = Math.max(0, newBalance - creditsUsed);
      await adminClient
        .from("sellers")
        .update({ credit_balance: newBalance })
        .eq("id", sellerId);

      await adminClient.from("credit_transactions").insert({
        seller_id: sellerId,
        amount: -creditsUsed,
        type: "api_key_usage",
        description: `API usage via ${endpoint} (${creditsUsed} credit${creditsUsed > 1 ? "s" : ""})`,
      });
    }

    await adminClient.from("api_usage_logs").insert({
      seller_id: sellerId,
      endpoint,
      credits_used: creditsUsed,
      request_body: requestBody,
      response_status: responseStatus,
    });

    return new Response(
      JSON.stringify({
        success: true,
        seller_id: sellerId,
        credits_used: creditsUsed,
        credits_remaining: newBalance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("sync-api-usage error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
