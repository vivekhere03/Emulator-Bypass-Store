import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/verify-payment`;

Deno.test("verify-payment: rejects missing authorization", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ order_id: "test", transaction_id: "test", payment_type: "binance_pay" }),
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertExists(body.error);
});

Deno.test("verify-payment: rejects missing fields", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });
  const body = await res.json();
  // Should fail with 400 or 401 (bad token)
  assertEquals(res.ok, false);
  assertExists(body.error);
});

Deno.test("verify-payment: rejects invalid payment_type", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ order_id: "test", transaction_id: "test", payment_type: "invalid" }),
  });
  const body = await res.json();
  assertEquals(res.ok, false);
  assertExists(body.error);
});

Deno.test("verify-payment: CORS preflight returns 200", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  await res.text();
  assertEquals(res.status, 200);
  assertExists(res.headers.get("access-control-allow-origin"));
});
