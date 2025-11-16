// Supabase Edge Function: Stripe Webhook handler to sync plan state
// Requires env: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_PRICE_PRO, STRIPE_PRICE_ENTERPRISE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("origin") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
});

async function verifyStripeSignature(secret: string, body: string, header: string | null): Promise<boolean> {
  if (!header) return false;
  // header format: t=timestamp, v1=signature, v0=..., etc
  const parts = header.split(",").reduce((acc: Record<string, string>, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  const timestamp = parts["t"];
  const sig = parts["v1"];
  if (!timestamp || !sig) return false;
  const data = `${timestamp}.${body}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const hashHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
  // Compare timing-safe
  if (hashHex.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < hashHex.length; i++) diff |= hashHex.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });

  const rawBody = await req.text();
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SERVICE_ROLE_KEY) return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY not set in function secrets" }), { status: 500, headers: cors(req) });
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
    const PRICE_PRO = Deno.env.get("STRIPE_PRICE_PRO")!;
    const PRICE_ENTERPRISE = Deno.env.get("STRIPE_PRICE_ENTERPRISE")!;

    const signatureHeader = req.headers.get("stripe-signature");
    const valid = await verifyStripeSignature(STRIPE_WEBHOOK_SECRET, rawBody, signatureHeader);
    if (!valid) {
      return new Response(JSON.stringify({ error: "invalid signature" }), { status: 400, headers: cors(req) });
    }

    const event = JSON.parse(rawBody);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const updateOrg = async (orgId: string, fields: Record<string, unknown>) => {
      await admin
        .from("organizations")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", orgId);
    };

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const orgId = sub.metadata?.org_id as string | undefined;
        if (!orgId) break;
        const status = sub.status as string;
        const item = sub.items?.data?.[0];
        const priceId = item?.price?.id as string | undefined;
        const plan = priceId === PRICE_ENTERPRISE ? "enterprise" : priceId === PRICE_PRO ? "pro" : null;
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

        const fields: Record<string, unknown> = {
          plan_status: status === "canceled" ? "canceled" : status,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId ?? null,
          current_period_end: periodEnd,
        };
        if (plan) fields["plan"] = plan;
        if (status === "canceled") fields["canceled_at"] = new Date().toISOString();
        await updateOrg(orgId, fields);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object;
        const orgId = session.client_reference_id as string | undefined;
        if (!orgId) break;
        const fields: Record<string, unknown> = {
          stripe_customer_id: session.customer ?? null,
          stripe_subscription_id: session.subscription ?? null,
        };
        await updateOrg(orgId, fields);
        break;
      }
      default:
        // ignore
        break;
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...cors(req), "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors(req) });
  }
});