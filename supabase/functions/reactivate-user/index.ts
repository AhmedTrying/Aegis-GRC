import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  } as Record<string, string>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SERVICE_ROLE_KEY) return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY not set in function secrets" }), { status: 500, headers: cors(req) });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "missing Authorization header" }), { status: 401, headers: cors(req) });
    const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: auth } = await caller.auth.getUser();
    const user = auth?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors(req) });
    const { data: prof } = await caller.from("profiles").select("role, org_id").eq("id", user.id).single();
    if (!prof || prof.role !== "admin" || !prof.org_id) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: cors(req) });

    const body = await req.json();
    const id = String(body?.id || "");
    if (!id) return new Response(JSON.stringify({ error: "id is required" }), { status: 400, headers: cors(req) });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: updErr } = await admin.auth.admin.updateUserById(id, { ban_duration: "none" } as any);
    if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: cors(req) });

    await admin.from("audit_logs").insert({ org_id: prof.org_id, actor: user.id, actor_email: user.email, entity_type: "users", entity_id: id, action: "reactivate_user" });
    return new Response(JSON.stringify({ ok: true }), { headers: cors(req) });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors(req) });
  }
});