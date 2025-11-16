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
    if (!SERVICE_ROLE_KEY) return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY not set in function secrets" }), { status: 500, headers: getCorsHeaders(req) });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "missing Authorization" }), { status: 401, headers: getCorsHeaders(req) });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: auth } = await userClient.auth.getUser();
    const user = auth?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: getCorsHeaders(req) });

    const { policy_id, file_name, content_type, base64 } = await req.json();
    if (!policy_id || !file_name || !content_type || !base64) {
      return new Response(JSON.stringify({ error: "policy_id, file_name, content_type, base64 required" }), { status: 400, headers: getCorsHeaders(req) });
    }

    const { data: policy } = await userClient
      .from("policies")
      .select("id, org_id")
      .eq("id", policy_id)
      .single();
    if (!policy || !policy.org_id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: getCorsHeaders(req) });
    }

    // Hard gate: enforce storage quotas for the org
    const { data: orgRow } = await admin
      .from("organizations")
      .select("plan")
      .eq("id", policy.org_id)
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
      .like("storage_path", `org/${policy.org_id}/%`);
    const { count: evidencesCount } = await admin
      .from("control_evidences")
      .select("id", { count: "exact", head: true })
      .eq("org_id", policy.org_id);
    const totalItems = (policyFilesCount ?? 0) + (evidencesCount ?? 0);
    if (totalItems >= maxItems) {
      return new Response(JSON.stringify({ error: `Storage limit reached for ${plan} plan. Upgrade in Settings to upload more files.` }), { status: 403, headers: getCorsHeaders(req) });
    }

    const path = `org/${policy.org_id}/policies/${policy_id}/${Date.now()}_${file_name}`;
    const fileBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const { error: upErr } = await admin.storage.from("policies").upload(path, fileBytes, { contentType: content_type, upsert: true });
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 400, headers: getCorsHeaders(req) });

    const { data: signed } = await admin.storage.from("policies").createSignedUrl(path, 60 * 60); // 1 hour

    await admin.from("policy_files").insert({
      policy_id,
      file_url: signed?.signedUrl || null,
      storage_path: path,
      file_name,
      file_type: content_type,
      file_size: null,
      status: "active",
    });

    return new Response(JSON.stringify({ ok: true, storage_path: path, signed_url: signed?.signedUrl || null }), { headers: getCorsHeaders(req) });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: getCorsHeaders(req) });
  }
});