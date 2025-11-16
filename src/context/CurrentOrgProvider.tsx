import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";

type CurrentOrg = {
  id: string;
  name: string | null;
  brand_color: string | null;
  logo_url: string | null;
  plan: string | null;
  slug: string | null;
  custom_domain: string | null;
};

type CurrentOrgContextValue = {
  org: CurrentOrg | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setOrgById: (orgId: string) => Promise<void>;
};

const CurrentOrgContext = createContext<CurrentOrgContextValue | null>(null);

export function CurrentOrgProvider({ children }: { children: React.ReactNode }) {
  const [org, setOrg] = useState<CurrentOrg | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const orgId = await getRequiredOrgId();
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, plan, brand_color, logo_url, slug, custom_domain")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      const o = data as any;
      setOrg({
        id: o.id,
        name: o.name ?? null,
        plan: o.plan ?? null,
        brand_color: o.brand_color ?? null,
        logo_url: o.logo_url ?? null,
        slug: o.slug ?? null,
        custom_domain: o.custom_domain ?? null,
      });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => {
      sub.subscription?.unsubscribe();
    };
  }, []);

  const setOrgById = async (orgId: string) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ org_id: orgId })
        .eq("id", user.id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  const value = useMemo<CurrentOrgContextValue>(() => ({ org, loading, error, refresh: load, setOrgById }), [org, loading, error]);

  return <CurrentOrgContext.Provider value={value}>{children}</CurrentOrgContext.Provider>;
}

export function useCurrentOrg() {
  const ctx = useContext(CurrentOrgContext);
  if (!ctx) throw new Error("useCurrentOrg must be used within CurrentOrgProvider");
  return ctx;
}