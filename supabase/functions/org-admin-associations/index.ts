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
    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY not set in function secrets" }), { status: 500, headers: { ...cors(req), "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing Authorization header" }), {
        status: 401,
        headers: { ...cors(req), "Content-Type": "application/json" },
      });
    }

    const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: auth } = await caller.auth.getUser();
    const user = auth?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors(req), "Content-Type": "application/json" } });
    }
    const { data: callerProfile, error: profErr } = await caller.from("profiles").select("id, role, org_id").eq("id", user.id).single();
    if (profErr || !callerProfile || callerProfile.role !== "admin" || !callerProfile.org_id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors(req), "Content-Type": "application/json" } });
    }
    const orgId = callerProfile.org_id as string;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "add_admin") {
      const profile_id = String(body?.profile_id || "");
      if (!profile_id) return new Response(JSON.stringify({ error: "profile_id required" }), { status: 400, headers: cors(req) });
      if (profile_id === callerProfile.id) return new Response(JSON.stringify({ error: "cannot_self_update" }), { status: 403, headers: cors(req) });
      const { data: orgRow } = await admin.from("organizations").select("id, owner_id").eq("id", orgId).single();
      if (orgRow && orgRow.owner_id === profile_id) {
        // already owner; ensure admin role and exit
        await admin.from("profiles").update({ role: "admin", org_id: orgId }).eq("id", profile_id);
        return new Response(JSON.stringify({ success: true }), { headers: cors(req) });
      }
      const { data: target, error: tErr } = await admin.from("profiles").select("id, org_id, role").eq("id", profile_id).single();
      if (tErr || !target) return new Response(JSON.stringify({ error: "profile not found" }), { status: 404, headers: cors(req) });
      if (target.org_id && target.org_id !== orgId) {
        return new Response(JSON.stringify({ error: "cross_org_assignment_forbidden" }), { status: 403, headers: cors(req) });
      }
      const { error: uErr } = await admin.from("profiles").update({ role: "admin", org_id: orgId }).eq("id", profile_id);
      if (uErr) return new Response(JSON.stringify({ error: uErr.message }), { status: 400, headers: cors(req) });
      await admin.from("audit_logs").insert({ org_id: orgId, actor: callerProfile.id, actor_email: user.email, entity_type: "profiles", entity_id: profile_id, action: "update_role", after_data: { role: "admin", org_id: orgId } });
      return new Response(JSON.stringify({ success: true }), { headers: cors(req) });
    }

    if (action === "remove_admin") {
      const profile_id = String(body?.profile_id || "");
      const new_role = String(body?.new_role || "manager");
      if (!profile_id) return new Response(JSON.stringify({ error: "profile_id required" }), { status: 400, headers: cors(req) });
      if (!["manager", "viewer"].includes(new_role)) return new Response(JSON.stringify({ error: "invalid role" }), { status: 400, headers: cors(req) });
      if (profile_id === callerProfile.id) return new Response(JSON.stringify({ error: "cannot_self_update" }), { status: 403, headers: cors(req) });
      const { data: orgRow2 } = await admin.from("organizations").select("id, owner_id").eq("id", orgId).single();
      if (orgRow2 && orgRow2.owner_id === profile_id) return new Response(JSON.stringify({ error: "cannot_demote_owner" }), { status: 403, headers: cors(req) });
      const { data: target, error: tErr } = await admin.from("profiles").select("id, org_id, role").eq("id", profile_id).single();
      if (tErr || !target) return new Response(JSON.stringify({ error: "profile not found" }), { status: 404, headers: cors(req) });
      if (target.org_id !== orgId) return new Response(JSON.stringify({ error: "cross_org_update_forbidden" }), { status: 403, headers: cors(req) });
      const { error: uErr } = await admin.from("profiles").update({ role: new_role }).eq("id", profile_id).eq("org_id", orgId);
      if (uErr) return new Response(JSON.stringify({ error: uErr.message }), { status: 400, headers: cors(req) });
      await admin.from("audit_logs").insert({ org_id: orgId, actor: callerProfile.id, actor_email: user.email, entity_type: "profiles", entity_id: profile_id, action: "update_role", after_data: { role: new_role } });
      return new Response(JSON.stringify({ success: true }), { headers: cors(req) });
    }

    if (action === "set_role") {
      const profile_id = String(body?.profile_id || "");
      const new_role = String(body?.new_role || "");
      if (!profile_id || !new_role) return new Response(JSON.stringify({ error: "profile_id and new_role required" }), { status: 400, headers: cors(req) });
      if (!["manager", "viewer"].includes(new_role)) return new Response(JSON.stringify({ error: "invalid role" }), { status: 400, headers: cors(req) });
      if (profile_id === callerProfile.id) return new Response(JSON.stringify({ error: "cannot_self_update" }), { status: 403, headers: cors(req) });
      const { data: orgRow3 } = await admin.from("organizations").select("id, owner_id").eq("id", orgId).single();
      if (orgRow3 && orgRow3.owner_id === profile_id) return new Response(JSON.stringify({ error: "cannot_demote_owner" }), { status: 403, headers: cors(req) });
      const { data: target, error: tErr } = await admin.from("profiles").select("id, org_id, role").eq("id", profile_id).single();
      if (tErr || !target) return new Response(JSON.stringify({ error: "profile not found" }), { status: 404, headers: cors(req) });
      if (target.org_id !== orgId) return new Response(JSON.stringify({ error: "cross_org_update_forbidden" }), { status: 403, headers: cors(req) });
      const { error: uErr } = await admin.from("profiles").update({ role: new_role }).eq("id", profile_id).eq("org_id", orgId);
      if (uErr) return new Response(JSON.stringify({ error: uErr.message }), { status: 400, headers: cors(req) });
      await admin.from("audit_logs").insert({ org_id: orgId, actor: callerProfile.id, actor_email: user.email, entity_type: "profiles", entity_id: profile_id, action: "update_role", after_data: { role: new_role } });
      return new Response(JSON.stringify({ success: true }), { headers: cors(req) });
    }

    if (action === "transfer_owner") {
      const new_owner_id = String(body?.new_owner_id || "");
      if (!new_owner_id) return new Response(JSON.stringify({ error: "new_owner_id required" }), { status: 400, headers: cors(req) });
      const { data: target, error: tErr } = await admin.from("profiles").select("id, org_id, role").eq("id", new_owner_id).single();
      if (tErr || !target) return new Response(JSON.stringify({ error: "profile not found" }), { status: 404, headers: cors(req) });
      if (target.org_id !== orgId) return new Response(JSON.stringify({ error: "cross_org_transfer_forbidden" }), { status: 403, headers: cors(req) });
      if (target.role !== "admin") await admin.from("profiles").update({ role: "admin" }).eq("id", new_owner_id).eq("org_id", orgId);
      const { error: oErr } = await admin.from("organizations").update({ owner_id: new_owner_id }).eq("id", orgId);
      if (oErr) return new Response(JSON.stringify({ error: oErr.message }), { status: 400, headers: cors(req) });
      await admin.from("audit_logs").insert({ org_id: orgId, actor: callerProfile.id, actor_email: user.email, entity_type: "organizations", entity_id: orgId, action: "transfer_owner", after_data: { owner_id: new_owner_id } });
      return new Response(JSON.stringify({ success: true }), { headers: cors(req) });
    }

    if (action === "link_profile_org") {
      const profile_id = String(body?.profile_id || "");
      if (!profile_id) return new Response(JSON.stringify({ error: "profile_id required" }), { status: 400, headers: cors(req) });
      const { data: target, error: tErr } = await admin.from("profiles").select("id, org_id").eq("id", profile_id).single();
      if (tErr || !target) return new Response(JSON.stringify({ error: "profile not found" }), { status: 404, headers: cors(req) });
      if (target.org_id && target.org_id !== orgId) return new Response(JSON.stringify({ error: "cross_org_link_forbidden" }), { status: 403, headers: cors(req) });
      const { error: uErr } = await admin.from("profiles").update({ org_id: orgId }).eq("id", profile_id);
      if (uErr) return new Response(JSON.stringify({ error: uErr.message }), { status: 400, headers: cors(req) });
      await admin.from("audit_logs").insert({ org_id: orgId, actor: callerProfile.id, actor_email: user.email, entity_type: "user_management", entity_id: profile_id, action: "adopt_unassigned_profile", after_data: { org_id: orgId } });
      return new Response(JSON.stringify({ success: true }), { headers: cors(req) });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...cors(req), "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors(req), "Content-Type": "application/json" } });
  }
});