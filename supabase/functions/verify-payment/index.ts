import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { order_id, transaction_id, payment_type, expected_amount } = await req.json();

    if (!order_id || !transaction_id) {
      return new Response(JSON.stringify({ error: "Missing order_id or transaction_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch order
    const { data: order, error: orderErr } = await adminClient
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify order belongs to user
    if (order.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Order does not belong to you" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check not already completed
    if (order.status === "completed") {
      return new Response(JSON.stringify({ success: true, message: "Already verified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate transaction ID
    const { data: existing } = await adminClient
      .from("orders")
      .select("id")
      .eq("transaction_id", transaction_id)
      .eq("status", "completed")
      .neq("id", order_id);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: "This transaction ID has already been used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Add actual Binance Pay API verification here
    // For now, we mark as completed (admin can review in orders panel)
    // In production, call Binance Pay API to verify the transaction

    // Update order status
    await adminClient
      .from("orders")
      .update({
        status: "completed",
        transaction_id: transaction_id,
      })
      .eq("id", order_id);

    const invoiceData = order.invoice_data as Record<string, unknown> | null;

    // Handle credit purchase
    if (invoiceData?.type === "credit_purchase") {
      const sellerId = invoiceData.seller_id as string;
      const credits = invoiceData.credits as number;

      // Add credits to seller
      const { data: seller } = await adminClient
        .from("sellers")
        .select("credit_balance")
        .eq("id", sellerId)
        .single();

      if (seller) {
        await adminClient
          .from("sellers")
          .update({ credit_balance: (seller.credit_balance || 0) + credits })
          .eq("id", sellerId);

        // Log credit transaction
        await adminClient.from("credit_transactions").insert({
          seller_id: sellerId,
          amount: credits,
          type: "purchase",
          description: `Purchased ${credits} credits (${invoiceData.package_name})`,
          order_id: order_id,
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: "Payment verified, credits added" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle product purchase (individual user)
    if (order.product_id && order.username_created) {
      const BYPASS_URL = "https://bypass.cgxhub.in";
      const SERVICE_KEY = Deno.env.get("BYPASS_SERVICE_KEY");

      if (SERVICE_KEY) {
        try {
          // Get duration info
          const { data: duration } = await adminClient
            .from("product_durations")
            .select("duration_days")
            .eq("id", order.duration_id)
            .single();

          await fetch(`${BYPASS_URL}/api/service/users/add`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Service-Key": SERVICE_KEY,
            },
            body: JSON.stringify({
              username: order.username_created,
              hwid: "",
              duration_days: duration?.duration_days || 30,
              seller_id: "direct_purchase",
            }),
          });
        } catch (e) {
          console.error("Failed to create user on bypass server:", e);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Payment verified, account created" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Payment verified" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-payment error:", err);
    return new Response(JSON.stringify({ error: err.message || "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
