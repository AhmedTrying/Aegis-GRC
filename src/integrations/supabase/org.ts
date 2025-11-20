import { supabase } from "./client";
import type { Database } from "./types";
import { recordAudit } from "./audit";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type OrgRow = Database["public"]["Tables"]["organizations"]["Row"];

let bootstrapOrgInflight: Promise<{ org: OrgRow | null; profile: ProfileRow | null } | null> | null = null;

function deriveOrgName(email: string | null, fullName: string | null): string {
  const nameFromFull = fullName ? `${fullName.split(" ")[0]}'s Organization` : "New Organization";
  if (!email) return nameFromFull;
  const parts = email.split("@");
  if (parts.length !== 2) return nameFromFull;
  const domain = parts[1].split(".")[0] || "Org";
  const pretty = domain.charAt(0).toUpperCase() + domain.slice(1);
  return `${pretty}`;
}

async function getCurrentProfile(): Promise<ProfileRow | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user || null;
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, org_id")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return data as ProfileRow;
}

async function ensureProfile(userId: string, email: string | null, fullName: string | null): Promise<ProfileRow | null> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, org_id")
    .eq("id", userId)
    .single();
  if (existing) {
    const row = existing as ProfileRow;
    if ((row.role as any) !== "admin" && !row.org_id) {
      const { data: updated } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", userId)
        .select("id, full_name, email, role, org_id")
        .single();
      try {
        await recordAudit({ entity_type: "profiles", entity_id: userId, action: "bootstrap_role_admin", before_data: { role: row.role, org_id: row.org_id }, after_data: { role: "admin", org_id: row.org_id } });
      } catch { void 0; }
      return (updated as ProfileRow) || row;
    }
    return row;
  }
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, email, full_name: fullName, role: "admin" })
    .select("id, full_name, email, role, org_id")
    .single();
  if (error) return null;
  return data as ProfileRow;
}

export async function resolveCurrentOrg(): Promise<{
  orgId: string | null;
  org: OrgRow | null;
  profile: ProfileRow | null;
  bootstrapped: boolean;
}> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user || null;
  if (!user) {
    return { orgId: null, org: null, profile: null, bootstrapped: false };
  }

  let profile = await getCurrentProfile();
  if (!profile) {
    profile = await ensureProfile(user.id, user.email ?? null, (user.user_metadata as any)?.full_name ?? null);
  }
  if (!profile) {
    return { orgId: null, org: null, profile: null, bootstrapped: false };
  }

  // Try to resolve org by hostname (subdomain or custom domain) before falling back
  let hostOrg: OrgRow | null = null;
  try {
    const host = (typeof window !== "undefined" ? window.location.hostname : "");
    if (host) {
      if (host.endsWith("grc-guard.com")) {
        const parts = host.split(".");
        const sub = parts.length > 2 ? parts[0] : parts[0];
        if (sub && sub !== "www" && sub !== "app") {
          const { data } = await supabase
            .from("organizations")
            .select("id, name, plan, owner_id, created_at, updated_at")
            .eq("slug", sub)
            .single();
          hostOrg = (data as OrgRow) || null;
        }
      } else {
        // Custom domain mapping (only adopt if status is active)
        const { data } = await supabase
          .from("organizations")
          .select("id, name, plan, owner_id, created_at, updated_at")
          .eq("custom_domain", host)
          .eq("custom_domain_status", "active")
          .single();
        hostOrg = (data as OrgRow) || null;
      }
    }
  } catch {
    // ignore hostname resolution errors
  }

  // If hostname points to an org and the profile is unassigned or matches, adopt it
  if (hostOrg) {
    if (!profile.org_id) {
      const newRole = hostOrg.owner_id === profile.id ? "admin" : (profile.role || "viewer");
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .update({ org_id: hostOrg.id, role: newRole })
        .eq("id", profile.id)
        .select("id, full_name, email, role, org_id")
        .single();
      try {
        await recordAudit({ entity_type: "profiles", entity_id: profile.id, action: "update_role", before_data: { role: profile.role, org_id: profile.org_id }, after_data: { role: newRole, org_id: hostOrg.id } });
      } catch { void 0; }
      return {
        orgId: hostOrg.id as string,
        org: hostOrg,
        profile: (updatedProfile as ProfileRow) || profile,
        bootstrapped: false,
      };
    }
    if (profile.org_id === hostOrg.id) {
      return { orgId: hostOrg.id as string, org: hostOrg, profile, bootstrapped: false };
    }
    // If the profile belongs to a different org, do not override here
  }

  if (profile.org_id) {
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("id, name, plan, owner_id, created_at, updated_at")
      .eq("id", profile.org_id)
      .single();
    if (orgRow && (orgRow as any).owner_id === profile.id && profile.role !== "admin") {
      const { data: upd } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", profile.id)
        .select("id, full_name, email, role, org_id")
        .single();
      try {
        await recordAudit({ entity_type: "profiles", entity_id: profile.id, action: "bootstrap_role_admin", before_data: { role: profile.role, org_id: profile.org_id }, after_data: { role: "admin", org_id: profile.org_id } });
      } catch { void 0; }
      profile = (upd as ProfileRow) || profile;
    }
    return { orgId: profile.org_id, org: (orgRow as OrgRow) || null, profile, bootstrapped: false };
  }

  let orgName = deriveOrgName(profile.email ?? null, profile.full_name ?? null);
  const metaName = (auth?.user?.user_metadata as any)?.org_pending_name as string | undefined;
  if (typeof metaName === "string" && metaName.trim().length > 1) {
    orgName = metaName.trim();
  } else {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("pending_org") : null;
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending && typeof pending.name === "string" && pending.name.trim().length > 1) {
          orgName = pending.name.trim();
        }
      }
    } catch { void 0; }
  }
  if (!bootstrapOrgInflight) {
    bootstrapOrgInflight = supabase
      .functions
      .invoke("bootstrap-org", { body: { org_name: orgName } })
      .then(({ data }) => (data as any) || null)
      .finally(() => { bootstrapOrgInflight = null; });
  }
  const fn = await bootstrapOrgInflight;
  const fnErr = null;
  if (fnErr) {
    return { orgId: null, org: null, profile, bootstrapped: false };
  }
  try { if (typeof window !== "undefined") window.localStorage.removeItem("pending_org"); } catch { void 0; }
  const org = (fn as any)?.org || null;
  const prof = (fn as any)?.profile || profile;
  if (org?.id) {
    return { orgId: org.id as string, org: org as OrgRow, profile: prof as ProfileRow, bootstrapped: true };
  }
  return { orgId: null, org: null, profile: prof as ProfileRow, bootstrapped: false };
}

export async function getCurrentOrgId(): Promise<string | null> {
  const result = await resolveCurrentOrg();
  return result.orgId;
}

export class OrgResolutionError extends Error {
  code:
    | "NOT_AUTHENTICATED"
    | "PROFILE_NOT_FOUND"
    | "ORG_NOT_FOUND"
    | "BOOTSTRAP_FAILED";
  constructor(message: string, code: OrgResolutionError["code"]) {
    super(message);
    this.name = "OrgResolutionError";
    this.code = code;
  }
}

export async function getRequiredOrgId(): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user || null;
  if (!user) {
    throw new OrgResolutionError("Please log in to access this feature", "NOT_AUTHENTICATED");
  }
  const { orgId, profile, bootstrapped } = await resolveCurrentOrg();
  if (orgId) return orgId;
  if (!profile) {
    throw new OrgResolutionError("User profile not found. Please contact support.", "PROFILE_NOT_FOUND");
  }
  // If we tried to bootstrap and still have no org, surface a clear error
  if (bootstrapped === true && !orgId) {
    throw new OrgResolutionError("Failed to create organization. Please contact support.", "BOOTSTRAP_FAILED");
  }
  throw new OrgResolutionError("No organization linked to this profile. Please contact support.", "ORG_NOT_FOUND");
}

export async function requireAdminInOrg(): Promise<{ orgId: string; profileId: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user || null;
  if (!user) {
    throw new OrgResolutionError("Not authenticated", "NOT_AUTHENTICATED");
  }
  const { data: profile } = await supabase.from("profiles").select("id, role, org_id").eq("id", user.id).single();
  const p = profile as any;
  if (!p?.org_id) {
    const orgId = await getRequiredOrgId();
    const { data: pf } = await supabase.from("profiles").select("id, role, org_id").eq("id", user.id).single();
    const pr = pf as any;
    if (!pr?.org_id) throw new OrgResolutionError("No organization linked to this profile", "ORG_NOT_FOUND");
    if (pr?.role !== "admin") throw new OrgResolutionError("Forbidden", "ORG_NOT_FOUND");
    return { orgId, profileId: pr.id as string };
  }
  if (p.role !== "admin") {
    throw new OrgResolutionError("Forbidden", "ORG_NOT_FOUND");
  }
  return { orgId: p.org_id as string, profileId: p.id as string };
}