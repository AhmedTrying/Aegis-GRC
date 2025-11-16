import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgPlan } from "@/hooks/useOrgPlan";
import { toast } from "@/hooks/use-toast";
import { CreditCard, Cog, Palette, Image as ImageIcon, Megaphone, Mail, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const { org, loading } = useOrgPlan();
  const [brandColor, setBrandColor] = useState<string>(org?.brand_color || "#4f46e5");
  const [logoUrl, setLogoUrl] = useState<string>(org?.logo_url || "");
  const [slug, setSlug] = useState<string>(org?.slug || "");
  const [customDomain, setCustomDomain] = useState<string>(org?.custom_domain || "");
  const [customDomainStatus, setCustomDomainStatus] = useState<string>(org?.custom_domain_status || "inactive");
  const [ssoGoogle, setSsoGoogle] = useState<boolean>(!!org?.sso_google_enabled);
  const [ssoAzure, setSsoAzure] = useState<boolean>(!!org?.sso_azure_enabled);
  const scimStatus = org?.scim_status || "disabled";
  const scimToken = org?.scim_provisioning_token || "";
  const scimLastSync = org?.scim_last_sync_at || null;
  const [riskAppetite, setRiskAppetite] = useState<number>(org?.risk_appetite_threshold ?? 12);
  const [frameworks, setFrameworks] = useState<Array<{ id: string; name: string }>>([]);
  const [disabledFrameworkIds, setDisabledFrameworkIds] = useState<string[]>(org?.disabled_framework_ids || []);
  const [notifyRiskDue, setNotifyRiskDue] = useState<boolean>(false);
  const [notifyTaskOverdue, setNotifyTaskOverdue] = useState<boolean>(false);
  const [notifyAttestation, setNotifyAttestation] = useState<boolean>(false);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [admins, setAdmins] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; full_name: string | null; email: string | null; role: string }>>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [addAdminId, setAddAdminId] = useState<string>("");
  const [transferOwnerId, setTransferOwnerId] = useState<string>("");

  useEffect(() => {
    setBrandColor(org?.brand_color || "#4f46e5");
    setLogoUrl(org?.logo_url || "");
    setSlug(org?.slug || "");
    setCustomDomain(org?.custom_domain || "");
    setCustomDomainStatus(org?.custom_domain_status || "inactive");
    setSsoGoogle(!!org?.sso_google_enabled);
    setSsoAzure(!!org?.sso_azure_enabled);
    setRiskAppetite(org?.risk_appetite_threshold ?? 12);
    setDisabledFrameworkIds(org?.disabled_framework_ids || []);
  }, [org]);

  useEffect(() => {
    (async () => {
      try {
        const orgId = await getRequiredOrgId();
        const { data } = await supabase
          .from("frameworks")
          .select("id, name")
          .eq("org_id", orgId)
          .order("name");
        setFrameworks((data as Array<{ id: string; name: string }>) || []);
      } catch {
        setFrameworks([]);
      }
    })();
  }, []);

  const canManageBilling = role === "admin"; // Owner-gated can be layered later via owner flag

  const startCheckout = async (plan: "pro" | "enterprise" = "pro") => {
    try {
      const { data, error } = await supabase.functions.invoke("billing-checkout", { body: { plan } });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({ variant: "destructive", title: "Error", description: "No checkout URL returned." });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Checkout failed", description: msg });
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Portal error", description: msg });
    }
  };

  const saveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!org?.id) return;
      const { error } = await supabase
        .from("organizations")
        .update({ brand_color: brandColor || null, logo_url: logoUrl || null, updated_at: new Date().toISOString() })
        .eq("id", org.id);
      if (error) throw error;
      toast({ title: "Branding updated" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to update branding";
      toast({ variant: "destructive", title: "Save failed", description: msg });
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("notify_prefs");
      if (raw) {
        const prefs = JSON.parse(raw);
        setNotifyRiskDue(!!prefs.notifyRiskDue);
        setNotifyTaskOverdue(!!prefs.notifyTaskOverdue);
        setNotifyAttestation(!!prefs.notifyAttestation);
      }
    } catch { void 0; }
  }, []);

  const saveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const prefs = { notifyRiskDue, notifyTaskOverdue, notifyAttestation };
      localStorage.setItem("notify_prefs", JSON.stringify(prefs));
      await supabase.functions.invoke("notifications-save", { body: prefs });
      toast({ title: "Notifications updated" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to update notifications";
      toast({ variant: "destructive", title: "Save failed", description: msg });
    }
  };

  const openPreview = (type: "risk" | "task" | "attestation") => {
    let subject = "";
    let html = "";
    if (type === "risk") {
      subject = "Risk Review Due Soon";
      html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 8px">Risk Review Due Soon</h2>
          <p>A risk in your organization is approaching its next review date.</p>
          <ul>
            <li>Risk: Example Risk ABC-123</li>
            <li>Owner: Jane Doe</li>
            <li>Next Review: ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Please log in to review and update status.</p>
        </div>
      `;
    } else if (type === "task") {
      subject = "Task Overdue Reminder";
      html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 8px">Task Overdue</h2>
          <p>The following task is past due:</p>
          <ul>
            <li>Task: Remediate control gap</li>
            <li>Assigned To: John Smith</li>
            <li>Due Date: ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Update the task or adjust the due date.</p>
        </div>
      `;
    } else {
      subject = "Attestation Reminder";
      html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 8px">Attestation Reminder</h2>
          <p>You have a pending attestation to complete.</p>
          <ul>
            <li>Policy: Code of Conduct v2.1</li>
            <li>Due Date: ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Visit the attestation portal to acknowledge.</p>
        </div>
      `;
    }
    setPreviewTitle(subject);
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const saveDomainsAndSso = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!org?.id) return;
      const { error } = await supabase
        .from("organizations")
        .update({
          slug: slug || null,
          custom_domain: customDomain || null,
          custom_domain_status: customDomain ? (customDomainStatus || "pending") : null,
          sso_google_enabled: ssoGoogle,
          sso_azure_enabled: ssoAzure,
          updated_at: new Date().toISOString(),
        })
        .eq("id", org.id);
      if (error) throw error;
      toast({ title: "Domains & SSO updated" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to update settings";
      toast({ variant: "destructive", title: "Save failed", description: msg });
    }
  };

  const saveGrcSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!org?.id) return;
      const { error } = await supabase
        .from("organizations")
        .update({
          risk_appetite_threshold: riskAppetite ?? null,
          disabled_framework_ids: disabledFrameworkIds.length > 0 ? disabledFrameworkIds : [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", org.id);
      if (error) throw error;
      toast({ title: "GRC settings updated" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to update settings";
      toast({ variant: "destructive", title: "Save failed", description: msg });
    }
  };

  const loadOrgMembers = async () => {
    try {
      const orgId = await getRequiredOrgId();
      const { data: orgRow } = await supabase.from("organizations").select("id, owner_id").eq("id", orgId).single();
      setOwnerId((orgRow as any)?.owner_id || null);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("org_id", orgId)
        .order("full_name");
      const list = ((data || []) as Array<{ id: string; full_name: string | null; email: string | null; role: string }>);
      setMembers(list);
      setAdmins(list.filter((p) => p.role === "admin"));
    } catch {
      setMembers([]);
      setAdmins([]);
      setOwnerId(null);
    }
  };

  useEffect(() => { loadOrgMembers(); }, []);

  const addAdmin = async () => {
    if (!addAdminId) return;
    const { error } = await supabase.functions.invoke("org-admin-associations", { body: { action: "add_admin", profile_id: addAdminId } });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    toast({ title: "Admin added" });
    setAddAdminId("");
    loadOrgMembers();
  };

  const transferOwner = async () => {
    if (!transferOwnerId) return;
    const { error } = await supabase.functions.invoke("org-admin-associations", { body: { action: "transfer_owner", new_owner_id: transferOwnerId } });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    toast({ title: "Ownership transferred" });
    setTransferOwnerId("");
    loadOrgMembers();
  };

  const removeAdmin = async (profileId: string) => {
    const { error } = await supabase.functions.invoke("org-admin-associations", { body: { action: "remove_admin", profile_id: profileId, new_role: "manager" } });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }
    toast({ title: "Role updated" });
    loadOrgMembers();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cog className="h-5 w-5" />
            <CardTitle>Tenant Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading organization...</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Plan</span>
                <Badge variant="outline" className="capitalize">{org?.plan || "free"}</Badge>
                <Badge variant="secondary" className="capitalize">{org?.plan_status || "inactive"}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {org?.stripe_subscription_id ? (
                  <div className="space-y-1">
                    <div>Subscription: {org.stripe_subscription_id}</div>
                    <div>Customer: {org.stripe_customer_id || "—"}</div>
                    <div>Price: {org.stripe_price_id || "—"}</div>
                    <div>Period end: {org.current_period_end ? new Date(org.current_period_end).toLocaleString() : "—"}</div>
                  </div>
                ) : (
                  <div>No active subscription.</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Organization Admins</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {role !== "admin" ? (
            <p className="text-muted-foreground">Only Admin can manage admins.</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Owner</div>
                <div className="text-sm font-medium">{admins.find((a) => a.id === ownerId)?.full_name || admins.find((a) => a.id === ownerId)?.email || ownerId || "—"}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Admins</div>
                <div className="space-y-2">
                  {admins.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No admins in this tenant.</div>
                  ) : (
                    admins.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded border p-2">
                        <div>
                          <div className="text-sm font-medium">{a.full_name || a.email || a.id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={a.id === ownerId ? "secondary" : "outline"}>{a.id === ownerId ? "Owner" : "Admin"}</Badge>
                          {a.id !== ownerId && (
                            <Button variant="outline" onClick={() => removeAdmin(a.id)}>Remove Admin</Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Add Admin</Label>
                  <div className="flex items-center gap-2">
                    <select className="border rounded px-2 py-1 flex-1" value={addAdminId} onChange={(e)=>setAddAdminId(e.target.value)}>
                      <option value="">Select user</option>
                      {members.filter((m) => m.role !== "admin").map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name || m.email || m.id}</option>
                      ))}
                    </select>
                    <Button onClick={addAdmin} disabled={!addAdminId}>Add</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Transfer Ownership</Label>
                  <div className="flex items-center gap-2">
                    <select className="border rounded px-2 py-1 flex-1" value={transferOwnerId} onChange={(e)=>setTransferOwnerId(e.target.value)}>
                      <option value="">Select admin</option>
                      {admins.filter((a) => a.id !== ownerId).map((a) => (
                        <option key={a.id} value={a.id}>{a.full_name || a.email || a.id}</option>
                      ))}
                    </select>
                    <Button variant="secondary" onClick={transferOwner} disabled={!transferOwnerId}>Transfer</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Billing</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!canManageBilling ? (
            <p className="text-muted-foreground">Billing is available to Admins.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Button onClick={() => startCheckout("pro")} disabled={org?.plan === "pro" && org?.plan_status === "active"}>Start Pro Plan</Button>
                <Button variant="outline" onClick={() => startCheckout("enterprise")} disabled={org?.plan === "enterprise" && org?.plan_status === "active"}>Start Enterprise</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={openBillingPortal}>Open Billing Portal</Button>
              </div>
              <p className="text-xs text-muted-foreground">Use Checkout to subscribe or upgrade. The Billing Portal lets you manage plan, invoices, and payment methods.</p>
            </div>
          )}
        </CardContent>
    </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cog className="h-5 w-5" />
            <CardTitle>Domains & SSO</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {role !== "admin" ? (
            <p className="text-muted-foreground">Only Admin can manage domains and SSO.</p>
          ) : (
            <form className="space-y-4" onSubmit={saveDomainsAndSso}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">Org Slug</Label>
                  <Input id="slug" value={slug} onChange={(e)=>setSlug(e.target.value)} placeholder="acme" />
                  <p className="text-xs text-muted-foreground">Route {"`{slug}.grc-guard.com`"} to this tenant.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customDomain">Custom Domain</Label>
                  <Input id="customDomain" value={customDomain} onChange={(e)=>setCustomDomain(e.target.value)} placeholder="grc.acme.com" />
                  <div className="text-xs text-muted-foreground">Status: <span className="capitalize">{customDomain ? (customDomainStatus || "pending") : "inactive"}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Google SSO</div>
                    <div className="text-xs text-muted-foreground">Enable OAuth login via Google</div>
                  </div>
                  <Switch checked={ssoGoogle} onCheckedChange={setSsoGoogle} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Azure SSO</div>
                    <div className="text-xs text-muted-foreground">Enable OAuth login via Azure</div>
                  </div>
                  <Switch checked={ssoAzure} onCheckedChange={setSsoAzure} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">SCIM Provisioning</div>
                <div className="text-xs text-muted-foreground">Status: {scimStatus || "disabled"} • Last sync: {scimLastSync ? new Date(scimLastSync).toLocaleString() : "—"}</div>
                <div className="text-xs break-all">Token: {scimToken ? scimToken : "—"}</div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="submit">Save</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cog className="h-5 w-5" />
            <CardTitle>GRC Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {role !== "admin" ? (
            <p className="text-muted-foreground">Only Admin can update GRC defaults.</p>
          ) : (
            <form className="space-y-4" onSubmit={saveGrcSettings}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="riskAppetite">Risk Appetite Threshold</Label>
                  <Input
                    id="riskAppetite"
                    type="number"
                    min={1}
                    max={25}
                    value={riskAppetite}
                    onChange={(e) => setRiskAppetite(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Used to compute "Above Appetite" drill-down.</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Enabled Frameworks</div>
                <div className="space-y-2">
                  {frameworks.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No frameworks in this tenant.</p>
                  ) : (
                    frameworks.map((fw) => {
                      const enabled = !disabledFrameworkIds.includes(fw.id);
                      return (
                        <div key={fw.id} className="flex items-center justify-between rounded border p-2">
                          <div>
                            <div className="text-sm font-medium">{fw.name}</div>
                            <div className="text-xs text-muted-foreground">Toggle availability across Compliance.</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`fw-${fw.id}`} className="text-xs">{enabled ? "Enabled" : "Disabled"}</Label>
                            <Switch
                              id={`fw-${fw.id}`}
                              checked={enabled}
                              onCheckedChange={(val) => {
                                setDisabledFrameworkIds((prev) => {
                                  const set = new Set(prev);
                                  if (val === true) {
                                    set.delete(fw.id);
                                  } else {
                                    set.add(fw.id);
                                  }
                                  return Array.from(set);
                                });
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="submit">Save</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {role !== "admin" ? (
            <p className="text-muted-foreground">Only Admin can manage notifications.</p>
          ) : (
            <form className="space-y-4" onSubmit={saveNotifications}>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="flex items-center justify-between rounded border p-2">
                  <div>
                    <div className="text-sm font-medium">Risk Review Reminders</div>
                    <div className="text-xs text-muted-foreground">Email when risk review date is approaching</div>
                  </div>
                  <Switch checked={notifyRiskDue} onCheckedChange={setNotifyRiskDue} />
                </div>
                <div className="flex items-center justify-between rounded border p-2">
                  <div>
                    <div className="text-sm font-medium">Task Overdue Alerts</div>
                    <div className="text-xs text-muted-foreground">Email when tasks are past due</div>
                  </div>
                  <Switch checked={notifyTaskOverdue} onCheckedChange={setNotifyTaskOverdue} />
                </div>
                <div className="flex items-center justify-between rounded border p-2">
                  <div>
                    <div className="text-sm font-medium">Attestation Reminders</div>
                    <div className="text-xs text-muted-foreground">Email reminders for pending attestations</div>
                  </div>
                  <Switch checked={notifyAttestation} onCheckedChange={setNotifyAttestation} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" onClick={() => openPreview("risk")}> 
                  <Eye className="h-4 w-4 mr-2" /> Risk Reminder Preview
                </Button>
                <Button type="button" variant="outline" onClick={() => openPreview("task")}> 
                  <Eye className="h-4 w-4 mr-2" /> Task Overdue Preview
                </Button>
                <Button type="button" variant="outline" onClick={() => openPreview("attestation")}> 
                  <Eye className="h-4 w-4 mr-2" /> Attestation Preview
                </Button>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Emails are sent via backend triggers when enabled.
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Branding</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!canManageBilling ? (
            <p className="text-muted-foreground">Only Admin can update branding.</p>
          ) : (
            <form className="space-y-4" onSubmit={saveBranding}>
              <div className="space-y-2">
                <Label htmlFor="brandColor">Brand Color</Label>
                <Input id="brandColor" value={brandColor} onChange={(e)=>setBrandColor(e.target.value)} placeholder="#4f46e5" />
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-6 w-6 rounded" style={{ backgroundColor: brandColor || '#4f46e5' }} />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input id="logoUrl" value={logoUrl} onChange={(e)=>setLogoUrl(e.target.value)} placeholder="https://.../logo.png" />
                <p className="text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Paste a URL; uploading via portal will be added later.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="submit">Save</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;