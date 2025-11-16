import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { useOrgPlan } from "@/hooks/useOrgPlan";

export interface OrgUsageLimits {
  max_users: number;
  max_risks: number;
  max_frameworks: number;
  max_storage_items: number;
}

export interface OrgUsageCounts {
  users: number;
  risks: number;
  frameworks: number;
  storage_items: number; // policy_files + control_evidences
  storage_bytes: number; // sum(policy_files.size); evidence sizes not tracked
}

export function useOrgUsage() {
  const { org } = useOrgPlan();
  const [limits, setLimits] = useState<OrgUsageLimits | null>(null);
  const [counts, setCounts] = useState<OrgUsageCounts | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const orgId = await getRequiredOrgId();
        const plan = org?.plan || "free";
        // Fetch plan limits
        const { data: lim, error: limErr } = await supabase
          .from("plan_limits")
          .select("max_users, max_risks, max_frameworks, max_storage_items")
          .eq("plan", plan)
          .single();
        if (limErr) throw limErr;
        setLimits({
          max_users: lim?.max_users ?? 3,
          max_risks: lim?.max_risks ?? 50,
          max_frameworks: lim?.max_frameworks ?? 2,
          max_storage_items: lim?.max_storage_items ?? 20,
        });

        // Fetch counts for org
        const [{ count: users }, { count: risks }, { count: frameworks }] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId),
          supabase.from("risks").select("id", { count: "exact", head: true }).eq("org_id", orgId),
          supabase.from("frameworks").select("id", { count: "exact", head: true }).eq("org_id", orgId),
        ]);

        const { data: policyFiles } = await supabase
          .from("policy_files")
          .select("id, storage_path, size")
          .like("storage_path", `org/${orgId}/%`);
        const { count: evidences } = await supabase
          .from("control_evidences")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId);

        const storageBytes = (policyFiles || []).reduce((acc: number, f: any) => acc + (Number(f.size) || 0), 0);
        setCounts({
          users: users ?? 0,
          risks: risks ?? 0,
          frameworks: frameworks ?? 0,
          storage_items: (policyFiles?.length ?? 0) + (evidences ?? 0),
          storage_bytes: storageBytes,
        });
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [org?.plan]);

  return { limits, counts, loading, error } as const;
}