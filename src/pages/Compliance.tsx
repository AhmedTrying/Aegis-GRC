import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadControlEvidence, signEvidenceFile, deleteEvidenceFile } from "@/integrations/supabase/storage";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgUsage } from "@/hooks/useOrgUsage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Compliance = () => {
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [controls, setControls] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [missingEvidenceFilter, setMissingEvidenceFilter] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [bulkOwner, setBulkOwner] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedControl, setSelectedControl] = useState<any>(null);
  const [evidenceCounts, setEvidenceCounts] = useState<Record<string, number>>({});
  const [linkCounts, setLinkCounts] = useState<Record<string, { risks: number; policies: number }>>({});
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [evidenceMode, setEvidenceMode] = useState<"upload" | "replace" | "view">("view");
  const [evidenceForm, setEvidenceForm] = useState<{ file: File | null; version?: string; expires_at?: string }>({ file: null });
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testForm, setTestForm] = useState<{ period_start?: string; period_end?: string; sample_size?: number; exceptions_found?: number; conclusion: string }>({ conclusion: "design_only" });
  const [latestTests, setLatestTests] = useState<Record<string, any>>({});
  const [exceptionsDialogOpen, setExceptionsDialogOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState<{ type: "na" | "exception"; approver?: string; rationale?: string; expires_at?: string; compensating_control_id?: string }>({ type: "exception" });
  const [upcomingTests, setUpcomingTests] = useState<any[]>([]);
  const { role } = useUserRole();
  const { limits, counts } = useOrgUsage();
  const [formData, setFormData] = useState({
    status: "not_compliant",
    evidence_url: "",
  });

  useEffect(() => {
    fetchFrameworks();
  }, []);

  useEffect(() => {
    if (selectedFramework) {
      fetchControls();
    }
  }, [selectedFramework]);

  useEffect(() => {
    if (role === "admin" || role === "manager") {
      fetchProfiles();
    }
  }, [role]);

  // role provided by useUserRole

  const fetchFrameworks = async () => {
    const orgId = await getRequiredOrgId();
    const { data, error } = await supabase
      .from("frameworks")
      .select("*")
      .eq("org_id", orgId)
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch frameworks",
      });
    } else if (data) {
      // Dedupe by name to avoid duplicate options (e.g., SOC 2 shown twice)
      const seen = new Set<string>();
      const deduped = data.filter((fw: any) => {
        const key = (fw.name || "").trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setFrameworks(deduped);
      if (deduped.length > 0 && !selectedFramework) {
        setSelectedFramework(deduped[0].id);
      }
    }
  };

  const fetchControls = async () => {
    if (!selectedFramework) return;

    const orgId = await getRequiredOrgId();
    const { data, error } = await supabase
      .from("controls")
      .select("*")
      .eq("framework_id", selectedFramework)
      .eq("org_id", orgId)
      .order("code");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch controls",
      });
    } else if (data) {
      setControls(data);
      try {
        const ids = data.map((c: any) => c.id);
        if (ids.length > 0) {
          const { data: evs } = await supabase
            .from("control_evidences")
            .select("control_id, id")
            .in("control_id", ids)
            .eq("org_id", orgId);
          if (evs) {
            const counts: Record<string, number> = {};
            for (const row of evs) {
              counts[row.control_id] = (counts[row.control_id] || 0) + 1;
          }
          setEvidenceCounts(counts);
        }

        // Latest tests per control (effectiveness)
        const { data: tests } = await supabase
          .from("control_tests")
          .select("control_id, period_end, conclusion, sample_size, exceptions_found")
          .in("control_id", ids)
          .eq("org_id", orgId)
          .order("period_end", { ascending: false });
        if (tests) {
          const latest: Record<string, any> = {};
          for (const t of tests) {
            if (!latest[t.control_id]) latest[t.control_id] = t;
          }
          setLatestTests(latest);
        }

        // Link counts to risks/policies
        const [riskLinksRes, policyLinksRes] = await Promise.all([
          supabase
            .from("control_risk_links")
            .select("control_id, id")
            .in("control_id", ids)
            .eq("org_id", orgId),
          supabase
            .from("control_policy_links")
            .select("control_id, id")
            .in("control_id", ids)
            .eq("org_id", orgId),
        ]);
        const lc: Record<string, { risks: number; policies: number }> = {};
        const riskLinks = riskLinksRes.data || [];
        for (const rl of riskLinks) {
          lc[rl.control_id] = { risks: (lc[rl.control_id]?.risks || 0) + 1, policies: lc[rl.control_id]?.policies || 0 };
        }
        const policyLinks = policyLinksRes.data || [];
        for (const pl of policyLinks) {
          lc[pl.control_id] = { risks: lc[pl.control_id]?.risks || 0, policies: (lc[pl.control_id]?.policies || 0) + 1 };
        }
        setLinkCounts(lc);
        }
      } catch (e) {
        // Table may not exist yet; silently ignore
        setEvidenceCounts({});
        setLinkCounts({});
      }

      // Upcoming tests based on frequency + grace window
      const toDays = (freq: string) => {
        switch ((freq || "").toLowerCase()) {
          case "daily":
            return 1;
          case "weekly":
            return 7;
          case "monthly":
            return 30;
          case "quarterly":
            return 90;
          case "annual":
            return 365;
          default:
            return null;
        }
      };
      const graceDays = 7;
      const upcoming = data
        .map((c: any) => {
          const freqDays = toDays(c.frequency);
          if (!freqDays || !c.last_tested_date) return null;
          const last = new Date(c.last_tested_date);
          const due = new Date(last);
          due.setDate(due.getDate() + freqDays + graceDays);
          const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return { id: c.id, code: c.code, due_date: due.toISOString().slice(0, 10), days_left: daysLeft };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.days_left - b.days_left)
        .slice(0, 8);
      setUpcomingTests(upcoming as any[]);
    }
  };

  const fetchProfiles = async () => {
    const orgId = await getRequiredOrgId();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("org_id", orgId)
      .order("full_name");
    if (error) {
      // Non-blocking: owner assignment will be disabled on failure
      return;
    }
    if (data) {
      setProfiles(data);
      const map: Record<string, any> = {};
      for (const p of data) map[p.id] = p;
      setProfilesById(map);
    }
  };

  const updateControlOwner = async (controlId: string, ownerId: string | null) => {
    const orgId = await getRequiredOrgId();
    const { error } = await supabase
      .from("controls")
      .update({ owner: ownerId })
      .eq("id", controlId)
      .eq("org_id", orgId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to assign owner. Ensure DB migration is applied.",
      });
      return;
    }
    toast({ title: "Owner assigned", description: "Control owner updated" });
    fetchControls();
  };

  const handleEditControl = (control: any) => {
    setSelectedControl(control);
    setFormData({
      status: control.status,
      evidence_url: control.evidence_url || "",
    });
    setDialogOpen(true);
  };

  const handleUpdateControl = async (e: React.FormEvent) => {
    e.preventDefault();

    const orgId = await getRequiredOrgId();
    const { error } = await supabase
      .from("controls")
      .update({
        status: formData.status,
        evidence_url: formData.evidence_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedControl.id)
      .eq("org_id", orgId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Control updated",
      });
      fetchControls();
      setDialogOpen(false);
    }
  };

  const canEdit = role === "admin" || role === "manager";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return <Badge className="bg-green-100 text-green-700">Compliant</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-700">Partial</Badge>;
      case "not_compliant":
        return <Badge className="bg-red-100 text-red-700">Not Compliant</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const selectedFrameworkObj = frameworks.find((f) => f.id === selectedFramework) || null;
  const totalControls = controls.length;
  const compliantCount = controls.filter((c) => c.status === "compliant").length;
  const partialCount = controls.filter((c) => c.status === "partial").length;
  const notCompliantCount = controls.filter((c) => c.status === "not_compliant").length;
  const compliancePercent = totalControls ? Math.round((compliantCount / totalControls) * 100) : 0;
  const groupedByStatus: Record<string, any[]> = {
    compliant: controls.filter((c) => c.status === "compliant"),
    partial: controls.filter((c) => c.status === "partial"),
    not_compliant: controls.filter((c) => c.status === "not_compliant"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Compliance</h2>
        <p className="text-muted-foreground">Track compliance with frameworks and controls</p>
      </div>

      {upcomingTests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tests Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingTests.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div>
                    <div className="font-medium">{t.code}</div>
                    <div className="text-xs text-muted-foreground">Due: {t.due_date}</div>
                  </div>
                  <div className={t.days_left < 0 ? "text-red-600" : t.days_left <= 7 ? "text-amber-600" : "text-emerald-600"}>
                    {t.days_left < 0 ? `Overdue by ${Math.abs(t.days_left)}d` : `${t.days_left}d left`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        <Select value={selectedFramework || undefined} onValueChange={setSelectedFramework}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a framework" />
          </SelectTrigger>
          <SelectContent>
            {frameworks.map((framework) => (
              <SelectItem key={framework.id} value={framework.id}>
                {framework.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Framework Compliance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Framework</div>
                  <div className="text-lg font-semibold">{selectedFrameworkObj?.name || "—"}</div>
                </div>
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full" style={{background:`conic-gradient(#22c55e ${compliancePercent*3.6}deg, #e2e8f0 0deg)`}} />
                  <div className="absolute inset-2 rounded-full bg-slate-100" />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-900">
                    {compliancePercent}%
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded border p-2">
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-medium">{totalControls}</div>
                </div>
                <div className="rounded border p-2">
                  <div className="text-muted-foreground">Compliant</div>
                  <div className="font-medium text-emerald-700">{compliantCount}</div>
                </div>
                <div className="rounded border p-2">
                  <div className="text-muted-foreground">Non‑compliant</div>
                  <div className="font-medium text-red-700">{notCompliantCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Breakdown by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(["compliant","partial","not_compliant"] as const).map((key) => (
                  <div key={key} className="rounded border p-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {key === "compliant" ? "Compliant" : key === "partial" ? "Partial" : "Not Compliant"}
                      </div>
                      <div className="text-xs text-muted-foreground">{groupedByStatus[key].length}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {groupedByStatus[key].slice(0, 12).map((c) => (
                        <span key={c.id} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {c.code}
                        </span>
                      ))}
                      {groupedByStatus[key].length > 12 && (
                        <span className="text-xs text-muted-foreground">+{groupedByStatus[key].length - 12} more</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <Button size="sm" variant="ghost" onClick={() => setStatusFilters([key])}>View in table</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & search */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-full sm:w-[320px]"
            placeholder="Search by code or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex items-center gap-2">
            {[
              { key: "compliant", label: "Compliant" },
              { key: "partial", label: "Partial" },
              { key: "not_compliant", label: "Not Compliant" },
            ].map((f) => {
              const active = statusFilters.includes(f.key);
              return (
                <Button
                  key={f.key}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className={active ? "bg-green-600 text-white" : ""}
                  onClick={() => {
                    setStatusFilters((prev) =>
                      prev.includes(f.key)
                        ? prev.filter((x) => x !== f.key)
                        : [...prev, f.key]
                    );
                  }}
                >
                  {f.label}
                </Button>
              );
            })}
            <Button
              size="sm"
              variant={missingEvidenceFilter ? "default" : "outline"}
              className={missingEvidenceFilter ? "bg-amber-500 text-white" : ""}
              onClick={() => setMissingEvidenceFilter((v) => !v)}
            >
              Missing Evidence
            </Button>
          </div>
        </div>
      </div>

      {frameworks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No frameworks found. Contact your administrator to add frameworks.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedIds.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div className="text-sm text-muted-foreground">{selectedIds.length} selected</div>
                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Set status</Label>
                      <Select value={bulkStatus ?? undefined} onValueChange={(v) => setBulkStatus(v)}>
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue placeholder="Choose status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compliant">Compliant</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="not_compliant">Not Compliant</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          if (!bulkStatus) return;
                          const updates = selectedIds.map((id) =>
                            supabase
                              .from("controls")
                              .update({ status: bulkStatus, updated_at: new Date().toISOString() })
                              .eq("id", id)
                          );
                          await Promise.all(updates);
                          toast({ title: "Status updated", description: "Bulk status change applied" });
                          setSelectedIds([]);
                          fetchControls();
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Assign owner</Label>
                      <Select value={bulkOwner ?? undefined} onValueChange={(v) => setBulkOwner(v)}>
                        <SelectTrigger className="h-8 w-[220px]">
                          <SelectValue placeholder="Choose owner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Unassign</SelectItem>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.full_name || p.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const ownerValue = bulkOwner === "__none__" ? null : bulkOwner;
                          const orgId = await getRequiredOrgId();
                          const updates = selectedIds.map((id) =>
                            supabase
                              .from("controls")
                              .update({ owner: ownerValue })
                              .eq("id", id)
                              .eq("org_id", orgId)
                          );
                          await Promise.all(updates);
                          toast({ title: "Owners updated", description: "Bulk owner assignment applied" });
                          setSelectedIds([]);
                          fetchControls();
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        const dueDate = new Date();
                        dueDate.setDate(dueDate.getDate() + 7);
                          const orgId = await getRequiredOrgId();
                          const inserts = selectedIds.map((id) => {
                            const ctl = controls.find((c) => c.id === id);
                            const assigned = ctl?.owner || bulkOwner || null;
                            return supabase.from("tasks").insert({
                              title: `Request evidence for control ${ctl?.code || id}`,
                              assigned_to: assigned,
                              related_type: "control",
                              related_id: id,
                              status: "open",
                              due_date: dueDate.toISOString().slice(0, 10),
                              org_id: orgId,
                            });
                          });
                          await Promise.all(inserts);
                        toast({ title: "Evidence requests sent", description: "Tasks created for selected controls" });
                        setSelectedIds([]);
                      }}
                    >
                      Request evidence
                    </Button>
                  </div>
                )}
              </div>
            )}
            <Table className="table-fixed w-full">
              {/* Stable column widths via colgroup to keep header/body aligned */}
              <colgroup>
                {canEdit && <col style={{ width: "40px" }} />}
                <col style={{ width: "160px" }} />
                <col style={{ width: "40%" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "180px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "120px" }} />
                {canEdit && <col style={{ width: "160px" }} />}
              </colgroup>
              <TableHeader>
                <TableRow>
                  {canEdit && (
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={(() => {
                          const visible = controls.filter((c) => {
                            const matchesSearch =
                              !search ||
                              (c.code || "").toLowerCase().includes(search.toLowerCase()) ||
                              (c.description || "").toLowerCase().includes(search.toLowerCase());
                            const matchesStatus = statusFilters.length === 0 || statusFilters.includes(c.status);
                            const matchesEvidence = !missingEvidenceFilter || !c.evidence_url;
                            return matchesSearch && matchesStatus && matchesEvidence;
                          });
                          return selectedIds.length > 0 && selectedIds.length === visible.length;
                        })()}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const allVisible = controls
                              .filter((c) => {
                                const matchesSearch =
                                  !search ||
                                  (c.code || "").toLowerCase().includes(search.toLowerCase()) ||
                                  (c.description || "").toLowerCase().includes(search.toLowerCase());
                                const matchesStatus = statusFilters.length === 0 || statusFilters.includes(c.status);
                                const matchesEvidence = !missingEvidenceFilter || !c.evidence_url;
                                return matchesSearch && matchesStatus && matchesEvidence;
                              })
                              .map((c) => c.id);
                            setSelectedIds(allVisible);
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[160px]">Code</TableHead>
                  <TableHead className="w-[40%]">Description</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[140px]">Effectiveness</TableHead>
                  <TableHead className="w-[180px]">Owner</TableHead>
                  <TableHead className="w-[160px]">Evidence</TableHead>
                  <TableHead className="w-[140px]">Links</TableHead>
                  <TableHead className="w-[120px]">Updated</TableHead>
                  {canEdit && <TableHead className="w-[160px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {controls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 10 : 8} className="text-center text-muted-foreground">
                      No controls found for this framework
                    </TableCell>
                  </TableRow>
                ) : (
                  // Apply filters & search
                  controls
                    .filter((control) => {
                      const matchesSearch =
                        !search ||
                        (control.code || "").toLowerCase().includes(search.toLowerCase()) ||
                        (control.description || "").toLowerCase().includes(search.toLowerCase());
                      const matchesStatus =
                        statusFilters.length === 0 || statusFilters.includes(control.status);
                      const matchesEvidence =
                        !missingEvidenceFilter || !control.evidence_url;
                      return matchesSearch && matchesStatus && matchesEvidence;
                    })
                    .map((control) => (
                  <TableRow key={control.id}>
                      {canEdit && (
                        <TableCell className="w-[40px]">
                          <Checkbox
                            checked={selectedIds.includes(control.id)}
                            onCheckedChange={(checked) => {
                              setSelectedIds((prev) =>
                                checked ? [...prev, control.id] : prev.filter((id) => id !== control.id)
                              );
                            }}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium whitespace-nowrap">{control.code}</TableCell>
                      <TableCell className="max-w-[500px] truncate">{control.description}</TableCell>
                      <TableCell className="whitespace-nowrap">{getStatusBadge(control.status)}</TableCell>
                      <TableCell>
                        {(() => {
                          const lt = latestTests[control.id];
                          if (!lt) return <span className="text-xs text-muted-foreground">Not tested</span>;
                          const label = lt.conclusion === "effective" ? "Effective" : lt.conclusion === "ineffective" ? "Ineffective" : "Design only";
                          const color = lt.conclusion === "effective" ? "bg-emerald-100 text-emerald-700" : lt.conclusion === "ineffective" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700";
                          return <Badge className={color}>{label}</Badge>;
                        })()}
                      </TableCell>
                      <TableCell>
                        {control.owner && profilesById[control.owner] ? (
                          <span className="text-sm text-foreground">
                            {profilesById[control.owner].full_name || profilesById[control.owner].email}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                        {canEdit && profiles.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="ml-2">
                                Assign owner
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => updateControlOwner(control.id, null)}>
                                Unassign
                              </DropdownMenuItem>
                              {profiles.map((p) => (
                                <DropdownMenuItem key={p.id} onClick={() => updateControlOwner(control.id, p.id)}>
                                  {p.full_name || p.email}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(() => {
                            const count = evidenceCounts[control.id] ?? (control.evidence_url ? 1 : 0);
                            if (count === 0) {
                              return <span className="text-xs text-amber-600">Missing</span>;
                            }
                            return <span className="text-xs text-muted-foreground">{count} file{count > 1 ? "s" : ""}</span>;
                          })()}
                          {canEdit ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={!!limits && !!counts && counts.storage_items >= limits.max_storage_items}
                                title={limits && counts && counts.storage_items >= limits.max_storage_items ? 'Storage limit reached — upgrade in Settings' : undefined}
                                onClick={async () => {
                                  setEvidenceMode("upload");
                                  setSelectedControl(control);
                                  setEvidenceForm({ file: null, version: "", expires_at: "" });
                                  setEvidenceDialogOpen(true);
                                }}
                              >
                                Upload
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  setEvidenceMode("view");
                                  setSelectedControl(control);
                                  try {
                                    const orgId = await getRequiredOrgId();
                                    const { data: evs } = await supabase
                                      .from("control_evidences")
                                    .select("id, file_url, storage_path, version, status, updated_at, expires_at")
                                    .eq("control_id", control.id)
                                    .eq("org_id", orgId)
                                    .order("updated_at", { ascending: false });
                                  setEvidenceList(evs || []);
                                } catch {
                                  setEvidenceList([]);
                                }
                                setEvidenceDialogOpen(true);
                              }}
                              >
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEvidenceMode("replace");
                                  setSelectedControl(control);
                                  setEvidenceForm({ file: null, version: "", expires_at: "" });
                                  setEvidenceDialogOpen(true);
                                }}
                              >
                                Replace
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                setEvidenceMode("view");
                                setSelectedControl(control);
                                try {
                                  const orgId = await getRequiredOrgId();
                                  const { data: evs } = await supabase
                                    .from("control_evidences")
                                    .select("id, file_url, storage_path, version, status, updated_at, expires_at")
                                    .eq("control_id", control.id)
                                    .eq("org_id", orgId)
                                    .order("updated_at", { ascending: false });
                                  setEvidenceList(evs || []);
                                } catch {
                                  setEvidenceList([]);
                                }
                                setEvidenceDialogOpen(true);
                              }}
                            >
                              View
                            </Button>
                          )}
                      </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const counts = linkCounts[control.id] || { risks: 0, policies: 0 };
                          return (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-sky-700 whitespace-nowrap">Risks {counts.risks}</span>
                              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700 whitespace-nowrap">Policies {counts.policies}</span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {control.updated_at
                          ? new Date(control.updated_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditControl(control)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedControl(control);
                              setTestForm({ conclusion: "design_only" });
                              setTestDialogOpen(true);
                            }}
                          >
                            Test
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedControl(control);
                              setExceptionForm({ type: "exception" });
                              setExceptionsDialogOpen(true);
                            }}
                          >
                            N/A / Exception
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Control Status</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateControl} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="not_compliant">Not Compliant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence_url">Evidence URL</Label>
              <Input
                id="evidence_url"
                type="url"
                value={formData.evidence_url}
                onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                placeholder="https://"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Evidence modal for upload/view/replace */}
      <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {evidenceMode === "view" ? "Evidence" : evidenceMode === "upload" ? "Upload Evidence" : "Replace Evidence"}
            </DialogTitle>
          </DialogHeader>
          {evidenceMode === "view" ? (
            <div className="space-y-3">
              {evidenceList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No evidence files yet.</p>
              ) : (
                evidenceList.map((ev) => {
                  const daysLeft = ev.expires_at
                    ? Math.ceil((new Date(ev.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <div key={ev.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <div className="space-y-1">
                        <div className="font-medium truncate max-w-[360px]">{ev.file_url}</div>
                        <div className="text-xs text-muted-foreground">
                          Version: {ev.version || "n/a"} • Status: {ev.status} • Updated: {ev.updated_at ? new Date(ev.updated_at).toLocaleDateString() : "-"} • Expires: {ev.expires_at || "-"}
                          {typeof daysLeft === "number" && ` (expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'})`}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                if (ev.storage_path) {
                                  const res = await signEvidenceFile(ev.storage_path);
                                  const url = res.signed_url || ev.file_url;
                                  if (url) window.open(url, "_blank");
                                } else if (ev.file_url) {
                                  window.open(ev.file_url, "_blank");
                                }
                              } catch (e: any) {
                                toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to open" });
                              }
                            }}
                          >Open</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                if (!selectedControl || !ev.storage_path) return;
                                await deleteEvidenceFile(selectedControl.id, ev.storage_path);
                                const orgId = await getRequiredOrgId();
                                const { data: evs } = await supabase
                                  .from("control_evidences")
                                  .select("id, file_url, storage_path, version, status, updated_at, expires_at")
                                  .eq("control_id", selectedControl.id)
                                  .eq("org_id", orgId)
                                  .order("updated_at", { ascending: false });
                                setEvidenceList(evs || []);
                                fetchControls();
                              } catch (e: any) {
                                toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to delete" });
                              }
                            }}
                          >Delete</Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (limits && counts && counts.storage_items >= limits.max_storage_items) {
                    toast({ variant: "destructive", title: "Upload disabled", description: "Storage limit reached for your plan. Visit Settings to upgrade." });
                    return;
                  }
                  if (!selectedControl || !evidenceForm.file) {
                    toast({ variant: "destructive", title: "Error", description: "Select a file" });
                    return;
                  }
                  const result = await uploadControlEvidence(selectedControl.id, evidenceForm.file, { version: evidenceForm.version || null, expires_at: evidenceForm.expires_at || null });
                  toast({ title: "Evidence saved", description: "File uploaded and pending review" });
                  setEvidenceDialogOpen(false);
                  fetchControls();
                } catch (err: any) {
                  toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to save evidence" });
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="file">Evidence File *</Label>
                <Input id="file" type="file" onChange={(e) => setEvidenceForm({ ...evidenceForm, file: e.target.files?.[0] || null })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={evidenceForm.version || ""}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, version: e.target.value })}
                  placeholder="v1.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiry (YYYY-MM-DD)</Label>
                <Input
                  id="expires_at"
                  value={evidenceForm.expires_at || ""}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, expires_at: e.target.value })}
                  placeholder="2025-01-31"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEvidenceDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Control Testing modal */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Control Test</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedControl) return;
              const orgId = await getRequiredOrgId();
              const { error } = await supabase
                .from("control_tests")
                .insert({
                  control_id: selectedControl.id,
                  period_start: testForm.period_start || null,
                  period_end: testForm.period_end || null,
                  sample_size: testForm.sample_size || null,
                  exceptions_found: testForm.exceptions_found || null,
                  conclusion: testForm.conclusion,
                  org_id: orgId,
                });
              if (error) {
                toast({ variant: "destructive", title: "Error", description: error.message });
              } else {
                toast({ title: "Test recorded", description: "Control testing entry saved" });
                setTestDialogOpen(false);
                fetchControls();
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="period_start">Test period start</Label>
                <Input id="period_start" value={testForm.period_start || ""} onChange={(e) => setTestForm({ ...testForm, period_start: e.target.value })} placeholder="YYYY-MM-DD" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period_end">Test period end</Label>
                <Input id="period_end" value={testForm.period_end || ""} onChange={(e) => setTestForm({ ...testForm, period_end: e.target.value })} placeholder="YYYY-MM-DD" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sample_size">Sample size</Label>
                <Input id="sample_size" type="number" value={testForm.sample_size ?? ""} onChange={(e) => setTestForm({ ...testForm, sample_size: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exceptions_found">Exceptions found</Label>
                <Input id="exceptions_found" type="number" value={testForm.exceptions_found ?? ""} onChange={(e) => setTestForm({ ...testForm, exceptions_found: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conclusion</Label>
              <Select value={testForm.conclusion} onValueChange={(v) => setTestForm({ ...testForm, conclusion: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design_only">Design only</SelectItem>
                  <SelectItem value="effective">Effective</SelectItem>
                  <SelectItem value="ineffective">Ineffective</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button type="button" variant="outline" onClick={async () => {
                if (!selectedControl) return;
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 14);
                const orgId = await getRequiredOrgId();
                await supabase.from("tasks").insert({
                  title: `Open remediation task for control ${selectedControl.code}`,
                  assigned_to: selectedControl.owner || null,
                  related_type: "control",
                  related_id: selectedControl.id,
                  status: "open",
                  due_date: dueDate.toISOString().slice(0, 10),
                  org_id: orgId,
                });
                toast({ title: "Task created", description: "Remediation task opened" });
              }}>Open remediation task</Button>
              <div>
                <Button type="button" variant="outline" onClick={() => setTestDialogOpen(false)}>Cancel</Button>
                <Button className="ml-2" type="submit">Save</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Exceptions / N/A modal */}
      <Dialog open={exceptionsDialogOpen} onOpenChange={setExceptionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark N/A or Record Exception</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedControl) return;
              const orgId = await getRequiredOrgId();
              const { error } = await supabase
                .from("control_exceptions")
                .insert({
                  control_id: selectedControl.id,
                  type: exceptionForm.type,
                  approver: exceptionForm.approver || null,
                  rationale: exceptionForm.rationale || null,
                  expires_at: exceptionForm.expires_at || null,
                  compensating_control_id: exceptionForm.compensating_control_id || null,
                  org_id: orgId,
                });
              if (error) {
                toast({ variant: "destructive", title: "Error", description: error.message });
              } else {
                toast({ title: "Saved", description: "Exception recorded" });
                setExceptionsDialogOpen(false);
                fetchControls();
              }
            }}
          >
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={exceptionForm.type} onValueChange={(v) => setExceptionForm({ ...exceptionForm, type: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="na">N/A</SelectItem>
                  <SelectItem value="exception">Exception</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="approver">Approver</Label>
                <Select value={exceptionForm.approver || undefined} onValueChange={(v) => setExceptionForm({ ...exceptionForm, approver: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select approver" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiry</Label>
                <Input id="expires_at" value={exceptionForm.expires_at || ""} onChange={(e) => setExceptionForm({ ...exceptionForm, expires_at: e.target.value })} placeholder="YYYY-MM-DD" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rationale">Rationale</Label>
              <Input id="rationale" value={exceptionForm.rationale || ""} onChange={(e) => setExceptionForm({ ...exceptionForm, rationale: e.target.value })} placeholder="Brief rationale" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compensating">Compensating control</Label>
              <Select value={exceptionForm.compensating_control_id || undefined} onValueChange={(v) => setExceptionForm({ ...exceptionForm, compensating_control_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select alternative control" />
                </SelectTrigger>
                <SelectContent>
                  {controls.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button type="button" variant="outline" onClick={async () => {
                if (!selectedControl) return;
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 14);
                const orgId = await getRequiredOrgId();
                await supabase.from("tasks").insert({
                  title: `Open remediation task for control ${selectedControl.code}`,
                  assigned_to: selectedControl.owner || null,
                  related_type: "control",
                  related_id: selectedControl.id,
                  status: "open",
                  due_date: dueDate.toISOString().slice(0, 10),
                  org_id: orgId,
                });
                toast({ title: "Task created", description: "Remediation task opened" });
              }}>Open remediation task</Button>
              <div>
                <Button type="button" variant="outline" onClick={() => setExceptionsDialogOpen(false)}>Cancel</Button>
                <Button className="ml-2" type="submit">Save</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Compliance;
