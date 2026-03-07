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
    const callerId = user.id;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check caller is admin
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, credits } = await req.json();
    if (!email?.trim()) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creditAmount = Math.max(0, parseInt(credits) || 0);

    // Find user by email in profiles
    const { data: profile } = await adminClient
      .from("profiles")
      .select("user_id, email, display_name")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "No user found with that email" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already a seller
    const { data: existingSeller } = await adminClient
      .from("sellers")
      .select("id")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (existingSeller) {
      return new Response(JSON.stringify({ error: "User is already a seller" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create seller record
    const { data: newSeller, error: sellerErr } = await adminClient
      .from("sellers")
      .insert({
        user_id: profile.user_id,
        credit_balance: creditAmount,
        status: "active",
      })
      .select()
      .single();

    if (sellerErr) {
      return new Response(JSON.stringify({ error: sellerErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add seller role
    await adminClient.from("user_roles").insert({
      user_id: profile.user_id,
      role: "seller",
    });

    // Log credit transaction if credits > 0
    if (creditAmount > 0) {
      await adminClient.from("credit_transactions").insert({
        seller_id: newSeller.id,
        amount: creditAmount,
        type: "admin_credit",
        description: `Admin added ${creditAmount} credits (new seller)`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        seller_id: newSeller.id,
        display_name: profile.display_name,
        email: profile.email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
