// Supabase Edge Function: Create Auth User with password and profile role
// Only callable by an authenticated admin

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

    // Validate request body
    const { email, password, full_name, role, require_password_reset } = await req.json();
    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: "email, password, and role are required" }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 400,
      });
    }
    const allowedRoles = ["admin", "manager", "viewer"];
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "invalid role" }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Caller auth: verify requester is logged-in and is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing Authorization header" }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role, org_id")
      .eq("id", user.id)
      .single();
    if (profileErr || !profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 403,
      });
    }
    const inviterOrgId = profile.org_id ?? null;
    if (!inviterOrgId) {
      return new Response(JSON.stringify({ error: "inviter has no org" }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Admin client for privileged operations
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Hard gate: enforce plan user quota before creating auth user
    const { data: orgRow } = await admin
      .from("organizations")
      .select("plan")
      .eq("id", inviterOrgId)
      .single();
    const plan = orgRow?.plan ?? "free";
    const { data: limits } = await admin
      .from("plan_limits")
      .select("max_users")
      .eq("plan", plan)
      .single();
    const maxUsers = limits?.max_users ?? 3;
    const { count: userCount } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("org_id", inviterOrgId);
    if ((userCount ?? 0) >= maxUsers) {
      return new Response(
        JSON.stringify({ error: `User limit reached for ${plan} plan. Upgrade in Settings to add more users.` }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }, status: 403 },
      );
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name ?? null, require_password_reset: !!require_password_reset },
    });
    let newUserId: string | null = created?.user?.id ?? null;
    if (createErr || !newUserId) {
      const msg = createErr?.message?.toLowerCase() || "";
      const isExists = /exist|already.*registered|email_exists/i.test(msg);
      if (!isExists) {
        // Secondary fallback: invite by email to let user set password
        const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
        if (!inviteErr && invited?.user?.id) {
          newUserId = invited.user.id;
        } else {
          return new Response(JSON.stringify({ error: createErr?.message || inviteErr?.message || "failed to create user" }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 400,
          });
        }
      }
      // Fallback: list users via admin API and match by email
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (!listErr && Array.isArray(list?.users)) {
        const found = list.users.find((u: any) => String(u?.email || "").toLowerCase() === String(email).toLowerCase());
        newUserId = found?.id ?? null;
      }
      if (!newUserId) {
        return new Response(JSON.stringify({ error: "email_exists_but_unresolvable" }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          status: 400,
        });
      }
      // If profile exists and points to another org, block.
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id, org_id")
        .eq("id", newUserId)
        .maybeSingle();
      if (existingProfile?.org_id && existingProfile.org_id !== inviterOrgId) {
        return new Response(JSON.stringify({ error: "user_belongs_to_another_org" }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          status: 403,
        });
      }
      if (!existingProfile) {
        const { error: insertExistingErr } = await admin
          .from("profiles")
          .insert({ id: newUserId, email, full_name: full_name ?? null, role, org_id: inviterOrgId });
        if (insertExistingErr) {
          return new Response(JSON.stringify({ error: insertExistingErr.message }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 400,
          });
        }
      } else {
        const { error: attachErr } = await admin
          .from("profiles")
          .update({ org_id: inviterOrgId, role })
          .eq("id", newUserId);
        if (attachErr) {
          return new Response(JSON.stringify({ error: attachErr.message }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
            status: 400,
          });
        }
      }
      await admin.from("user_invite_logs").insert({ org_id: inviterOrgId, inviter_id: user.id, invitee_email: email, invitee_id: newUserId, role });
      return new Response(
        JSON.stringify({ ok: true, userId: newUserId, linked: true }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }, status: 200 },
      );
    }
    const { error: insertErr } = await admin
      .from("profiles")
      .insert({ id: newUserId, email, full_name: full_name ?? null, role, org_id: inviterOrgId });
    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message, userId: newUserId }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Log invite/create event for auditing
    await admin.from("user_invite_logs").insert({
      org_id: inviterOrgId,
      inviter_id: user.id,
      invitee_email: email,
      invitee_id: newUserId,
      role,
    });

    return new Response(
      JSON.stringify({ ok: true, userId: newUserId }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      status: 500,
    });
  }
});