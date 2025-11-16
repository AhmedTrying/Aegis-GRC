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
      .select("stripe_customer_id")
      .eq("id", profile.org_id)
      .single();

    let customerId = org?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const custRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: formEncode({ email: profile.email ?? "", "metadata[org_id]": profile.org_id }),
      });
      const custJson = await custRes.json();
      if (!custRes.ok) return new Response(JSON.stringify({ error: custJson.error?.message || "stripe customer error" }), { status: 400, headers: cors(req) });
      customerId = custJson.id;
      await client
        .from("organizations")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("id", profile.org_id);
    }

    const invRes = await fetch(`https://api.stripe.com/v1/invoices?customer=${encodeURIComponent(customerId!)}&limit=20`, {
      method: "GET",
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    const invJson = await invRes.json();
    if (!invRes.ok) return new Response(JSON.stringify({ error: invJson.error?.message || "stripe error" }), { status: 400, headers: cors(req) });

    const invoices = (invJson.data || []).map((row: any) => ({
      id: row.id,
      status: row.status ?? null,
      amount_due: row.amount_due ?? null,
      currency: row.currency ?? null,
      created: row.created ?? null,
      hosted_invoice_url: row.hosted_invoice_url ?? null,
      invoice_pdf: row.invoice_pdf ?? null,
    }));

    return new Response(JSON.stringify({ invoices }), { headers: { ...cors(req), "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors(req) });
  }
});