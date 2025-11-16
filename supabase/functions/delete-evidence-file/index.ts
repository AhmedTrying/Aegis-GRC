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
    if (!authHeader) return new Response(JSON.stringify({ error: "missing Authorization" }), { status: 401, headers: cors(req) });
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: auth } = await userClient.auth.getUser();
    const user = auth?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors(req) });

    const { storage_path, control_id } = await req.json();
    if (!storage_path || !control_id) {
      return new Response(JSON.stringify({ error: "storage_path and control_id required" }), { status: 400, headers: cors(req) });
    }

    const { data: profile } = await userClient.from("profiles").select("org_id").eq("id", user.id).single();
    const orgId = profile?.org_id;
    if (!orgId || !storage_path.startsWith(`org/${orgId}/`)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: cors(req) });
    }

    const { data: control } = await userClient.from("controls").select("org_id").eq("id", control_id).single();
    if (!control || control.org_id !== orgId) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: cors(req) });
    }

    const { error: delErr } = await admin.storage.from("policies").remove([storage_path]);
    if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 400, headers: cors(req) });

    await admin.from("control_evidences").delete().eq("control_id", control_id).eq("storage_path", storage_path);
    return new Response(JSON.stringify({ ok: true }), { headers: cors(req) });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors(req) });
  }
});