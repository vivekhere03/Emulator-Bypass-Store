import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Binance API helpers ─────────────────────────────────────────

function generateSignature(queryString: string, secret: string): string {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(queryString);

  // Use Web Crypto HMAC-SHA256
  // Deno supports createHmac via std, but let's use the sync approach
  const hmac = new Uint8Array(32);
  // We'll use a simpler approach with crypto.subtle
  return ""; // placeholder — we'll use async version below
}

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

async function getBinancePayTransactions(
  apiKey: string,
  apiSecret: string,
  limit = 50
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const timestamp = Date.now().toString();
    const qs = `timestamp=${timestamp}&limit=${limit}`;
    const signature = await hmacSha256(apiSecret, qs);

    const resp = await fetch(
      `https://api.binance.com/sapi/v1/pay/transactions?${qs}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": apiKey } }
    );
    const json = await resp.json();

    if (!resp.ok) {
      return { success: false, error: json.msg || `HTTP ${resp.status}` };
    }

    const data = Array.isArray(json) ? json : json.data || [];
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

async function getBep20Deposits(
  apiKey: string,
  apiSecret: string,
  limit = 50
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const timestamp = Date.now().toString();
    const qs = `timestamp=${timestamp}&limit=${limit}&coin=USDT&network=BSC`;
    const signature = await hmacSha256(apiSecret, qs);

    const resp = await fetch(
      `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${qs}&signature=${signature}`,
      { headers: { "X-MBX-APIKEY": apiKey } }
    );
    const json = await resp.json();

    if (!resp.ok) {
      return { success: false, error: json.msg || `HTTP ${resp.status}` };
    }

    return { success: true, data: Array.isArray(json) ? json : [] };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

function verifyBinancePayTx(
  transactions: any[],
  orderId: string,
  expectedAmount: number,
  timeWindowHours: number
): { success: boolean; message: string } {
  const cutoff = Date.now() - timeWindowHours * 3600 * 1000;

  for (const tx of transactions) {
    const txOrderId = tx.orderId || tx.id || tx.prepayId || "";
    if (txOrderId !== orderId) continue;

    const timeField = tx.transactionTime || tx.createTime || tx.time || "0";
    const txTime = String(timeField).length > 10 ? Number(timeField) : Number(timeField) * 1000;
    const txAmount = parseFloat(tx.amount || "0");
    const currency = (tx.currency || "").toUpperCase();

    if (txTime < cutoff) {
      return { success: false, message: "Transaction found but is too old. Contact admin." };
    }
    if (currency === "USDT" && Math.abs(txAmount - expectedAmount) < 0.01) {
      return { success: true, message: `Binance Pay verified: ${txAmount} USDT` };
    }
    return {
      success: false,
      message: `Amount/currency mismatch. Expected ${expectedAmount} USDT, found ${txAmount} ${currency}`,
    };
  }
  return { success: false, message: "Order ID not found in recent Binance Pay transactions" };
}

function verifyBep20Tx(
  transactions: any[],
  txId: string,
  expectedAmount: number,
  timeWindowHours: number
): { success: boolean; message: string } {
  const cutoff = Date.now() - timeWindowHours * 3600 * 1000;
  const normalizedTxId = txId.trim().toLowerCase();

  for (const tx of transactions) {
    const txTxId = String(tx.txId || tx.id || "").trim().toLowerCase();
    if (!txTxId || txTxId !== normalizedTxId) continue;

    const insertTime = tx.insertTime || "0";
    const txTime = String(insertTime).length > 10 ? Number(insertTime) : Number(insertTime) * 1000;
    const txAmount = parseFloat(tx.amount || "0");
    const coin = (tx.coin || "").toUpperCase();

    if (txTime < cutoff) {
      return { success: false, message: "Transaction found but is too old. Contact admin." };
    }
    if (coin === "USDT" && Math.abs(txAmount - expectedAmount) < 0.01) {
      return { success: true, message: `BEP20 deposit verified: ${txAmount} USDT` };
    }
    return {
      success: false,
      message: `Amount/currency mismatch. Expected ${expectedAmount} USDT, found ${txAmount} ${coin}`,
    };
  }
  return { success: false, message: "Transaction not found in recent BEP20 deposits" };
}

// ── Main handler ────────────────────────────────────────────────

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

    // Deno environment auto-injects SUPABASE_URL and SUPABASE_ANON_KEY 
    const supabaseUrl = Deno.env.get("SUPA_URL") ?? Deno.env.get("URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPA_ANON_KEY") ?? Deno.env.get("ANON_KEY") ?? "";

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { order_id, transaction_id, payment_type } = await req.json();

    if (!order_id || !transaction_id) {
      return new Response(JSON.stringify({ error: "Missing order_id or transaction_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["binance_pay", "bep20", "upi"].includes(payment_type)) {
      return new Response(JSON.stringify({ error: "Invalid payment_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment_type === "bep20" && !/^0x[a-fA-F0-9]{64}$/.test(String(transaction_id).trim())) {
      return new Response(JSON.stringify({ error: "Invalid BEP20 transaction hash format" }), {
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

    // Check if order is expired or cancelled
    if (order.status === "expired" || order.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: `This order has been ${order.status}. Please create a new order.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-expire orders older than 10 minutes
    const orderAge = Date.now() - new Date(order.created_at).getTime();
    if (order.status === "pending" && orderAge > 10 * 60 * 1000) {
      await adminClient
        .from("orders")
        .update({ status: "expired" })
        .eq("id", order_id);
      return new Response(
        JSON.stringify({ error: "This order has expired. Please create a new order." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Allow retry for failed orders — reset to pending
    if (order.status === "failed") {
      await adminClient
        .from("orders")
        .update({ status: "pending" })
        .eq("id", order_id);
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

    // ── Real Binance API verification ───────────────────────────
    const BINANCE_API_KEY = Deno.env.get("BINANCE_API_KEY");
    const BINANCE_SECRET_KEY = Deno.env.get("BINANCE_SECRET_KEY");

    if (!BINANCE_API_KEY || !BINANCE_SECRET_KEY) {
      console.error("Missing BINANCE_API_KEY or BINANCE_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Payment verification not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Always use the server-side order amount, never trust client-provided amount
    const expectedAmount = parseFloat(order.amount);
    if (isNaN(expectedAmount) || expectedAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid order amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TIME_WINDOW_HOURS = 24;
    let verifyResult: { success: boolean; message: string };

    if (payment_type === "upi") {
      // Fetch INR price from credit package if available, otherwise fallback to rate
      let inrAmount = expectedAmount * 90; // default fallback
      const invoiceData = order.invoice_data as any;
      if (invoiceData?.type === "credit_purchase" && invoiceData?.package_id) {
        const { data: pkg } = await adminClient
          .from("credit_packages")
          .select("*")
          .eq("id", invoiceData.package_id)
          .single();
        if (pkg && (pkg as any).price_inr) {
          inrAmount = Number((pkg as any).price_inr);
        }
      }
      const utrParam = encodeURIComponent(transaction_id.trim());
      const vpsServiceKey = Deno.env.get("BYPASS_SERVICE_KEY");
      if (!vpsServiceKey) {
        return new Response(
          JSON.stringify({ error: "UPI verification service key is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const resp = await fetch(`https://upi.cgxhub.in/api/upi/verify/${utrParam}?amount=${inrAmount}&order_id=${order_id}`, {
          headers: {
            "X-Service-Key": vpsServiceKey,
            "User-Agent": "CGX-Supabase-Worker/1.0"
          }
        });

        if (!resp.ok) {
          const errText = await resp.text();
          console.error("VPS returned an error or was blocked by Cloudflare:", resp.status, errText);
          throw new Error(`Server returned ${resp.status}`);
        }

        const json = await resp.json();

        if (json.verified) {
          verifyResult = { success: true, message: `UPI payment verified: ${json.amount} INR from ${json.sender_upi}` };
        } else {
          verifyResult = { success: false, message: json.message || "UPI Verification failed. Try again." };
        }
      } catch (e) {
        console.error("UPI Verification error:", e);
        verifyResult = { success: false, message: `Failed to connect to UPI verification service: ${(e as Error).message}` };
      }
    } else if (payment_type === "binance_pay") {
      const txResult = await getBinancePayTransactions(BINANCE_API_KEY, BINANCE_SECRET_KEY);
      if (!txResult.success) {
        console.error("Binance Pay API error:", txResult.error);
        return new Response(
          JSON.stringify({ error: `Failed to verify with Binance: ${txResult.error}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      verifyResult = verifyBinancePayTx(txResult.data!, transaction_id, expectedAmount, TIME_WINDOW_HOURS);
    } else {
      const txResult = await getBep20Deposits(BINANCE_API_KEY, BINANCE_SECRET_KEY);
      if (!txResult.success) {
        console.error("BEP20 API error:", txResult.error);
        return new Response(
          JSON.stringify({ error: `Failed to verify with Binance: ${txResult.error}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      verifyResult = verifyBep20Tx(txResult.data!, transaction_id, expectedAmount, TIME_WINDOW_HOURS);
    }

    if (!verifyResult.success) {
      // Return the specific verification error (e.g., "Already used") to the frontend
      // without failing the whole order so the user can try again!
      return new Response(
        JSON.stringify({ error: verifyResult.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Payment verified — process the order ────────────────────

    // Update order status
    await adminClient
      .from("orders")
      .update({
        status: "completed",
        transaction_id: transaction_id,
      })
      .eq("id", order_id);

    // ── Send Discord webhook notification ───────────────────────
    const DISCORD_WEBHOOK = Deno.env.get("DISCORD_WEBHOOK_URL");
    try {
      const embedColor = 0x00ff88; // green
      const embed = {
        title: "✅ Payment Verification Success",
        description: "A new transaction has been successfully verified.",
        color: embedColor,
        fields: [
          { name: "💰 Amount", value: `${expectedAmount} USDT`, inline: true },
          { name: "📋 Method", value: payment_type === "binance_pay" ? "Binance Pay" : "BEP20 (USDT)", inline: true },
          { name: "🔑 Transaction ID", value: `\`${transaction_id}\``, inline: false },
          { name: "📦 Order ID", value: `\`${order_id}\``, inline: false },
        ],
        footer: { text: "CGX Payment System • Verified" },
        timestamp: new Date().toISOString(),
      };
      if (DISCORD_WEBHOOK) {
        await fetch(DISCORD_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] }),
        });
      }
    } catch (e) {
      console.error("Discord webhook failed (non-fatal):", e);
    }

    const invoiceData = order.invoice_data as Record<string, unknown> | null;

    // Handle credit purchase
    if (invoiceData?.type === "credit_purchase") {
      const sellerId = invoiceData.seller_id as string;
      const credits = invoiceData.credits as number;

      const { data: seller } = await adminClient
        .from("sellers")
        .select("credit_balance")
        .eq("id", sellerId)
        .single();

      if (seller) {
        const newBalance = (seller.credit_balance || 0) + credits;
        await adminClient
          .from("sellers")
          .update({ credit_balance: newBalance })
          .eq("id", sellerId);

        await adminClient.from("credit_transactions").insert({
          seller_id: sellerId,
          amount: credits,
          type: "purchase",
          description: `Purchased ${credits} credits (${invoiceData.package_name})`,
          order_id: order_id,
        });

        // Ensure user has seller role
        await adminClient.from("user_roles").insert({
          user_id: order.user_id,
          role: "seller",
        }).select().maybeSingle(); // ignore conflict if already exists

        // Sync credits to bypass server API key (if seller has one)
        const { data: sellerFull } = await adminClient
          .from("sellers")
          .select("api_key_hash")
          .eq("id", sellerId)
          .single();

        if (sellerFull?.api_key_hash) {
          const SERVICE_KEY = Deno.env.get("BYPASS_SERVICE_KEY");
          if (SERVICE_KEY) {
            try {
              await fetch(`https://bypass.cgxhub.in/api/service/keys/add-credits`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Service-Key": SERVICE_KEY,
                },
                body: JSON.stringify({
                  seller_id: sellerId,
                  credits: credits,
                }),
              });
            } catch (e) {
              console.error("Failed to sync credits to bypass server:", e);
            }
          }
        }
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
    return new Response(JSON.stringify({ error: (err as Error).message || "Verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
