import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentOrg } from "@/integrations/supabase/org";

export type UserRole = "admin" | "manager" | "viewer";

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>("viewer");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) setRole("viewer");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, org_id")
          .eq("id", user.id)
          .single();
        let nextRole = (profile?.role as UserRole) || "viewer";
        if (nextRole !== "admin" || !profile?.org_id) {
          try {
            await resolveCurrentOrg();
            const { data: re } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .single();
            nextRole = (re?.role as UserRole) || nextRole;
          } catch { /* noop */ }
        }
        if (isMounted) {
          setRole(nextRole);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRole();

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      // Re-fetch on auth changes
      setLoading(true);
      fetchRole();
    });

    return () => {
      isMounted = false;
      authSub.subscription?.unsubscribe();
    };
  }, []);

  return { role, loading } as const;
};