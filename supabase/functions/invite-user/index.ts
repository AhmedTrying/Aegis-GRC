// Supabase Edge Function: Invite User by Email and create profile
// Deploy: supabase functions deploy invite-user
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
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Require Authorization to identify inviter and org
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing Authorization header" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: auth } = await caller.auth.getUser();
    const inviter = auth?.user;
    if (!inviter) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const { data: inviterProfile, error: inviterErr } = await caller.from("profiles").select("role, org_id").eq("id", inviter.id).single();
    if (inviterErr || !inviterProfile || inviterProfile.role !== "admin" || !inviterProfile.org_id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const inviterOrgId = inviterProfile.org_id as string;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { email, full_name, role } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email is required" }), { status: 400, headers: getCorsHeaders(req) });
    }
    const validRoles = ["admin", "manager", "viewer"];
    const userRole = validRoles.includes(role) ? role : "viewer";

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
    let user = data?.user ?? null;
    if (error || !user) {
      const msg = error?.message?.toLowerCase() || "";
      const isExists = /exist|already.*registered|email_exists/i.test(msg);
      if (!isExists) {
        return new Response(JSON.stringify({ error: error?.message || "Failed to invite user" }), { status: 400, headers: getCorsHeaders(req) });
      }
      // Fallback: list users via admin API and match by email
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (!listErr && Array.isArray(list?.users)) {
        const found = list.users.find((u: any) => String(u?.email || "").toLowerCase() === String(email).toLowerCase());
        user = found ?? null;
      }
      if (!user?.id) {
        return new Response(JSON.stringify({ error: "email_exists_but_unresolvable" }), { status: 400, headers: getCorsHeaders(req) });
      }
      const { data: existingProfile } = await admin.from("profiles").select("id, org_id").eq("id", user.id).maybeSingle();
      if (existingProfile?.org_id && existingProfile.org_id !== inviterOrgId) {
        return new Response(JSON.stringify({ error: "user_belongs_to_another_org" }), { status: 403, headers: getCorsHeaders(req) });
      }
      if (!existingProfile) {
        await admin.from("profiles").insert({ id: user.id, full_name: full_name || null, email, role: userRole, org_id: inviterOrgId });
      } else {
        await admin.from("profiles").update({ org_id: inviterOrgId, role: userRole }).eq("id", user.id);
      }
    } else {
      await admin.from("profiles").upsert({
        id: user.id,
        full_name: full_name || null,
        email: email,
        role: userRole,
        org_id: inviterOrgId,
      });
    }

    // Log invite
    await admin.from("user_invite_logs").insert({
      org_id: inviterOrgId,
      inviter_id: inviter.id,
      invitee_email: email,
      invitee_id: user.id,
      role: userRole,
    });

    return new Response(JSON.stringify({ success: true, userId: user.id }), { headers: getCorsHeaders(req) });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: getCorsHeaders(req) });
  }
});