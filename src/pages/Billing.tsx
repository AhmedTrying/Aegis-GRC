import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId, resolveCurrentOrg } from "@/integrations/supabase/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";
import { CreditCard, ExternalLink } from "lucide-react";

interface InvoiceRow {
  id: string;
  status: string | null;
  amount_due: number | null;
  currency: string | null;
  created: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

const Billing = () => {
  const { role } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [org, setOrg] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [seats, setSeats] = useState<number | null>(null);

  const canManageBilling = role === "admin";

  useEffect(() => {
    fetchOrg();
  }, []);

  useEffect(() => {
    if (canManageBilling) {
      fetchInvoices();
    } else {
      setInvoices([]);
    }
  }, [canManageBilling]);

  const fetchOrg = async () => {
    setLoading(true);
    try {
      let orgId: string | null = null;
      try {
        orgId = await getRequiredOrgId();
      } catch {
        const { orgId: o } = await resolveCurrentOrg();
        orgId = o || null;
      }
      if (!orgId) throw new Error("No organization linked to this profile");
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, plan, plan_status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_end, canceled_at, updated_at")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      setOrg(data);
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);
      setSeats(count ?? null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to load organization" });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("billing-invoices", { body: {} });
      if (error) throw error;
      setInvoices((data?.invoices as InvoiceRow[]) || []);
    } catch (e: any) {
      setInvoices([]);
    }
  };

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

  const openBillingPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("billing-portal", { body: {} });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({ variant: "destructive", title: "Error", description: "No portal URL returned." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Portal error", description: e?.message || String(e) });
    }
  };

  const seatCount = useMemo(() => (seats != null ? seats : undefined), [seats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Billing</h2>
          <p className="text-muted-foreground">Manage plan, seats, and invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{org?.plan || "free"}</Badge>
          <Badge variant="secondary" className="capitalize">{org?.plan_status || "inactive"}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Subscription</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Plan</div>
                <div className="text-foreground font-medium capitalize">{org?.plan || "free"}</div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-foreground font-medium capitalize">{org?.plan_status || "inactive"}</div>
              <div className="text-sm text-muted-foreground">Renewal</div>
              <div className="text-foreground font-medium">{org?.current_period_end ? new Date(org.current_period_end).toLocaleString() : "—"}</div>
              <div className="text-sm text-muted-foreground">Seats</div>
              <div className="text-foreground font-medium">{seatCount != null ? seatCount : "—"}</div>
            </div>
              <div className="space-y-3">
                {canManageBilling ? (
                  <>
                    <div className="flex gap-2">
                      <Button onClick={() => startCheckout("pro")} disabled={org?.plan === "pro" && org?.plan_status === "active"}>Upgrade to Pro</Button>
                      <Button variant="outline" onClick={() => startCheckout("enterprise")} disabled={org?.plan === "enterprise" && org?.plan_status === "active"}>Upgrade to Enterprise</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={openBillingPortal}>Open Billing Portal</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Checkout starts a subscription. Use the Billing Portal to manage plan and download invoices.</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Billing is available to Admins.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Invoices</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="whitespace-nowrap">{inv.created ? new Date(inv.created * 1000).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{inv.amount_due != null ? `${(inv.amount_due / 100).toFixed(2)} ${inv.currency?.toUpperCase() || "USD"}` : "—"}</TableCell>
                    <TableCell className="capitalize">{inv.status || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {inv.hosted_invoice_url && (
                          <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600">
                            View <ExternalLink className="inline h-3 w-3 ml-1" />
                          </a>
                        )}
                        {inv.invoice_pdf && (
                          <a href={inv.invoice_pdf} target="_blank" rel="noreferrer" className="text-sm text-indigo-600">
                            PDF <ExternalLink className="inline h-3 w-3 ml-1" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;