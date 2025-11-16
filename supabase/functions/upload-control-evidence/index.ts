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

    const { control_id, file_name, content_type, base64, version, expires_at } = await req.json();
    if (!control_id || !file_name || !content_type || !base64) {
      return new Response(JSON.stringify({ error: "control_id, file_name, content_type, base64 required" }), { status: 400, headers: cors(req) });
    }

    const { data: control } = await userClient
      .from("controls")
      .select("id, org_id")
      .eq("id", control_id)
      .single();
    if (!control || !control.org_id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: cors(req) });
    }

    const { data: orgRow } = await admin
      .from("organizations")
      .select("plan")
      .eq("id", control.org_id)
      .single();
    const plan = orgRow?.plan ?? "free";
    const { data: limits } = await admin
      .from("plan_limits")
      .select("max_storage_items")
      .eq("plan", plan)
      .single();
    const maxItems = limits?.max_storage_items ?? 20;
    const { count: policyFilesCount } = await admin
      .from("policy_files")
      .select("id", { count: "exact", head: true })
      .like("storage_path", `org/${control.org_id}/%`);
    const { count: evidencesCount } = await admin
      .from("control_evidences")
      .select("id", { count: "exact", head: true })
      .eq("org_id", control.org_id);
    const totalItems = (policyFilesCount ?? 0) + (evidencesCount ?? 0);
    if (totalItems >= maxItems) {
      return new Response(JSON.stringify({ error: `Storage limit reached for ${plan} plan. Upgrade in Settings to upload more files.` }), { status: 403, headers: cors(req) });
    }

    const path = `org/${control.org_id}/controls/${control_id}/${Date.now()}_${file_name}`;
    const fileBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const { error: upErr } = await admin.storage.from("policies").upload(path, fileBytes, { contentType: content_type, upsert: true });
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 400, headers: cors(req) });

    const { data: signed } = await admin.storage.from("policies").createSignedUrl(path, 60 * 60);

    await admin.from("control_evidences").insert({
      control_id,
      file_url: signed?.signedUrl || null,
      storage_path: path,
      version: version || null,
      status: "pending_review",
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: expires_at || null,
      org_id: control.org_id,
    });

    await admin.from("controls").update({ evidence_url: signed?.signedUrl || null, updated_at: new Date().toISOString() }).eq("id", control_id).eq("org_id", control.org_id);

    return new Response(JSON.stringify({ ok: true, storage_path: path, signed_url: signed?.signedUrl || null }), { headers: cors(req) });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors(req) });
  }
});