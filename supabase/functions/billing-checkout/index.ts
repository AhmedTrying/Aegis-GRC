// Supabase Edge Function: Create Stripe Checkout Session for subscription
// Requires env: STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, STRIPE_PRICE_ENTERPRISE, APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("origin") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
});

const formEncode = (data: Record<string, string>) =>
  Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
    const PRICE_PRO = Deno.env.get("STRIPE_PRICE_PRO")!;
    const PRICE_ENTERPRISE = Deno.env.get("STRIPE_PRICE_ENTERPRISE")!;
    const APP_URL = Deno.env.get("APP_URL")!; // e.g., https://app.example.com

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "missing Authorization" }), { status: 401, headers: cors(req) });

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: auth } = await client.auth.getUser();
    const user = auth?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors(req) });

    const { data: profile } = await client
      .from("profiles")
      .select("id, email, role, org_id")
      .eq("id", user.id)
      .single();
    if (!profile?.org_id) return new Response(JSON.stringify({ error: "no org" }), { status: 400, headers: cors(req) });
    if (profile.role !== "admin") return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: cors(req) });

    const { data: org } = await client
      .from("organizations")
      .select("id, plan, plan_status, stripe_customer_id")
      .eq("id", profile.org_id)
      .single();

    const body = await req.json().catch(() => ({}));
    const requestedPlan = body?.plan || "pro"; // default
    const priceId = requestedPlan === "enterprise" ? PRICE_ENTERPRISE : PRICE_PRO;

    // Create customer if missing, attach org_id metadata
    let customerId = org?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const custRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formEncode({
          email: profile.email ?? "",
          "metadata[org_id]": profile.org_id,
        }),
      });
      const custJson = await custRes.json();
      if (!custRes.ok) return new Response(JSON.stringify({ error: custJson.error?.message || "stripe customer error" }), { status: 400, headers: cors(req) });
      customerId = custJson.id;

      // Persist customer id
      await client
        .from("organizations")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("id", profile.org_id);
    }

    // Create checkout session
    const successUrl = `${APP_URL}/dashboard?checkout=success`;
    const cancelUrl = `${APP_URL}/settings?checkout=cancel`;
    const payload = {
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId!,
      "client_reference_id": profile.org_id,
      "subscription_data[metadata][org_id]": profile.org_id,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
    };

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formEncode(payload),
    });
    const json = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: json.error?.message || "stripe error" }), { status: 400, headers: cors(req) });

    return new Response(JSON.stringify({ url: json.url }), { headers: { ...cors(req), "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors(req) });
  }
});