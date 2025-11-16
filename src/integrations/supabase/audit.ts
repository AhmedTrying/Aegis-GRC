import { supabase } from "./client";
import { getRequiredOrgId } from "./org";

type AuditPayload = {
  entity_type: string;
  entity_id?: string | number | null;
  action: "insert" | "update" | "delete" | string;
  before_data?: any;
  after_data?: any;
};

export async function recordAudit(payload: AuditPayload) {
  try {
    const org_id = await getRequiredOrgId();
    const { data: auth } = await supabase.auth.getUser();
    const actor = auth?.user?.id ?? null;
    const actor_email = auth?.user?.email ?? null;
    const row = {
      org_id,
      actor,
      actor_email,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id ? String(payload.entity_id) : null,
      action: payload.action,
      before_data: payload.before_data ?? null,
      after_data: payload.after_data ?? null,
    };
    await supabase.from("audit_logs").insert(row);
  } catch (e) {
    // Swallow errors to avoid interrupting UX on non-critical audit insert
    console.warn("audit insert failed", e);
  }
}