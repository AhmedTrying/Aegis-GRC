import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  } as Record<string, string>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY not set in function secrets" }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing Authorization header" }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 401,
      });
    }

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: auth } = await client.auth.getUser();
    const user = auth?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: getCorsHeaders(req) });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null;

    // Mark latest invite log for this user as accepted
    const { data: latest } = await admin
      .from("user_invite_logs")
      .select("id")
      .eq("invitee_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.id) {
      await admin
        .from("user_invite_logs")
        .update({ accepted_at: new Date().toISOString(), accepted_ip: ip })
        .eq("id", latest.id);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: getCorsHeaders(req) });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: getCorsHeaders(req) });
  }
});