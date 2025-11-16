import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOrgUsage } from "@/hooks/useOrgUsage";
import { useOrgPlan } from "@/hooks/useOrgPlan";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Usage = () => {
  const { limits, counts, loading, error } = useOrgUsage();
  const { org } = useOrgPlan();
  const { role } = useUserRole();

  const canUpgrade = role === "admin"; // Owner flag can be layered later

  const items = useMemo(() => {
    if (!limits || !counts) return [] as Array<{ key: string; label: string; used: number; max: number; pct: number }>; 
    const raw = [
      { key: "users", label: "Users", used: counts.users, max: limits.max_users },
      { key: "risks", label: "Risks", used: counts.risks, max: limits.max_risks },
      { key: "frameworks", label: "Frameworks", used: counts.frameworks, max: limits.max_frameworks },
      { key: "storage_items", label: "Storage Items", used: counts.storage_items, max: limits.max_storage_items },
    ];
    return raw.map((r) => ({ ...r, pct: Math.min(100, Math.round((r.used / Math.max(1, r.max)) * 100)) }));
  }, [limits, counts]);

  const startCheckout = async (plan: "pro" | "enterprise" = "pro") => {
    try {
      const { data, error } = await supabase.functions.invoke("billing-checkout", { body: { plan } });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({ variant: "destructive", title: "Error", description: "No checkout URL returned." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Checkout failed", description: e?.message || String(e) });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usage & Limits</CardTitle>
            <Badge variant="outline" className="capitalize">{org?.plan || "free"}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading usage…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && items.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <div key={item.key} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.used} / {item.max}</div>
                  </div>
                  <div className="mt-2">
                    <Progress value={item.pct} />
                    <div className="mt-1 text-xs text-muted-foreground">{item.pct}% used</div>
                  </div>
                  {canUpgrade && item.pct >= 80 && (
                    <div className="mt-2 flex items-center justify-between rounded border border-amber-300 bg-amber-50 p-2">
                      <div className="text-xs text-amber-900">Approaching plan limit — consider upgrading for higher caps.</div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startCheckout("pro")}>Upgrade</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {counts && (
            <div className="mt-4 rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="font-medium">Storage (estimate)</div>
                <div className="text-sm text-muted-foreground">{Math.round((counts.storage_bytes || 0) / 1024 / 1024)} MB</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Estimated from policy file sizes; evidence sizes not tracked</div>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            {!canUpgrade ? (
              <p className="text-sm text-muted-foreground">Upgrade available to Admins.</p>
            ) : (
              <>
                <Button onClick={() => startCheckout("pro")} disabled={org?.plan === "pro" && org?.plan_status === "active"}>Upgrade to Pro</Button>
                <Button variant="outline" onClick={() => startCheckout("enterprise")} disabled={org?.plan === "enterprise" && org?.plan_status === "active"}>Upgrade to Enterprise</Button>
                <p className="text-xs text-muted-foreground">Upgrading via Checkout unlocks higher limits immediately.</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Usage;