import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";

export interface OrgPlan {
  id: string;
  plan: string | null;
  plan_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
  updated_at: string | null;
  brand_color?: string | null;
  logo_url?: string | null;
  slug?: string | null;
  custom_domain?: string | null;
  custom_domain_status?: string | null;
  sso_google_enabled?: boolean | null;
  sso_azure_enabled?: boolean | null;
  scim_status?: string | null;
  scim_provisioning_token?: string | null;
  scim_last_sync_at?: string | null;
  risk_appetite_threshold?: number | null;
  disabled_framework_ids?: string[] | null;
}

export function useOrgPlan() {
  const [org, setOrg] = useState<OrgPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const orgId = await getRequiredOrgId();
        const { data, error } = await supabase
          .from("organizations")
          .select("id, plan, plan_status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_end, updated_at, brand_color, logo_url, slug, custom_domain, custom_domain_status, sso_google_enabled, sso_azure_enabled, scim_status, scim_provisioning_token, scim_last_sync_at, risk_appetite_threshold, disabled_framework_ids")
          .eq("id", orgId)
          .single();
        if (error) throw error;
        setOrg(data as OrgPlan);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { org, loading, error } as const;
}