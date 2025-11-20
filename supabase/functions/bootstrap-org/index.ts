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

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

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

    const body = (await req.json().catch(() => ({}))) as any;
    const orgNameRaw = String(body?.org_name || "").trim();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Ensure profile exists
    const { data: existingProfile } = await admin.from("profiles").select("id, email, full_name, role, org_id").eq("id", user.id).single();
    let profile = existingProfile as any;
    if (!profile) {
      const { data: created } = await admin
        .from("profiles")
        .insert({ id: user.id, email: user.email, full_name: (user.user_metadata as any)?.full_name ?? null, role: "admin" })
        .select("id, email, full_name, role, org_id")
        .single();
      profile = created as any;
    }

    if (profile.org_id) {
      const { data: org } = await admin.from("organizations").select("id, name, plan, owner_id").eq("id", profile.org_id).single();
      return new Response(JSON.stringify({ org, profile }), { headers: { ...cors(req), "Content-Type": "application/json" } });
    }

    // Adopt existing org if this user is owner already
    const { data: owned } = await admin
      .from("organizations")
      .select("id, name, plan, plan_status, owner_id, slug")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    let org = owned && (owned[0] as any);
    if (!org) {
      const metaName = String((user.user_metadata as any)?.org_pending_name || "").trim();
      const orgName = (metaName && metaName.length > 1) ? metaName : (orgNameRaw || (profile.full_name ? `${profile.full_name}'s Organization` : (user.email?.split("@")[0] || "Workspace")));
      const base = slugify(orgName) || "workspace";
      // First, try deterministic base slug
      {
        const { data: created, error } = await admin
          .from("organizations")
          .insert({ name: orgName, plan: "free", plan_status: "active", owner_id: user.id, slug: base, brand_color: "#4f46e5" })
          .select("id, name, plan, plan_status, owner_id, slug")
          .single();
        if (!error && created) {
          org = created as any;
        }
      }
      // If insert failed (race or slug conflict), re-check for an existing org for this owner and adopt it
      if (!org) {
        const { data: ownedAfter } = await admin
          .from("organizations")
          .select("id, name, plan, plan_status, owner_id, slug")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1);
        org = ownedAfter && (ownedAfter[0] as any);
      }
      // As a final fallback (true slug conflict with another org), create a unique slug
      if (!org) {
        const unique = `${base}-${crypto.randomUUID().slice(0,4)}`;
        const { data: created2, error: err2 } = await admin
          .from("organizations")
          .insert({ name: orgName, plan: "free", plan_status: "active", owner_id: user.id, slug: unique, brand_color: "#4f46e5" })
          .select("id, name, plan, plan_status, owner_id, slug")
          .single();
        if (!err2 && created2) { org = created2 as any; }
      }
      if (!org) return new Response(JSON.stringify({ error: "failed_to_create_org" }), { status: 400, headers: cors(req) });
    }

    // Link profile and ensure admin
    await admin.from("profiles").update({ org_id: org.id, role: "admin" }).eq("id", user.id);

    return new Response(JSON.stringify({ org, profile: { ...profile, org_id: org.id, role: "admin" } }), { headers: { ...cors(req), "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors(req), "Content-Type": "application/json" } });
  }
});