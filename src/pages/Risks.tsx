import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, ArrowDownWideNarrow, ArrowUpNarrowWide, CalendarDays, FileDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { RiskDialog } from "@/components/RiskDialog";
import { RiskDetail } from "@/components/RiskDetail";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgUsage } from "@/hooks/useOrgUsage";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "@/components/ui/pagination";

interface Risk {
  id: string;
  title: string;
  description: string;
  owner: string;
  likelihood: number;
  impact: number;
  score: number;
  status: string;
  next_review_date?: string;
  created_at?: string;
  profiles?: {
    full_name: string;
  };
}

interface UserProfile {
  id: string;
  role: string;
  full_name?: string;
}

type SortKey = "created_at" | "score" | "next_review_date";

const Risks = () => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [filteredRisks, setFilteredRisks] = useState<Risk[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [noPlansOnly, setNoPlansOnly] = useState(false);
  const [riskIdsWithPlans, setRiskIdsWithPlans] = useState<string[]>([]);
  const [riskIdsWithPlansDue, setRiskIdsWithPlansDue] = useState<string[]>([]);
  const [plansDueOnly, setPlansDueOnly] = useState(false);
  const [newLast30Only, setNewLast30Only] = useState(false);
  const [closedLast30Only, setClosedLast30Only] = useState(false);
  const [riskAppetite, setRiskAppetite] = useState(12);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [aboveAppetiteOnly, setAboveAppetiteOnly] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [owners, setOwners] = useState<UserProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const location = useLocation();
  const { role } = useUserRole();
  const { limits, counts } = useOrgUsage();

  useEffect(() => {
    fetchRisks();
    fetchOwners();
  }, [fetchRisks, fetchOwners]);

  useEffect(() => {
    filterRisks();
  }, [filterRisks]);

  // role is provided by useUserRole

  const fetchRisks = useCallback(async () => {
    try {
      const orgId = await getRequiredOrgId();
      const { data, error } = await supabase
        .from("risks")
        .select("*, profiles!risks_owner_fkey(full_name)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch risks" });
        setRisks([]);
        return;
      }
      setRisks((data as Risk[]) || []);
      const { data: planRows } = await supabase
        .from("treatment_plans")
        .select("risk_id, status, due_date")
        .eq("org_id", orgId);
      const ids = planRows
        ? Array.from(new Set(((planRows as { risk_id: string | null }[]).map((r) => r.risk_id)).filter(Boolean)))
        : [];
      setRiskIdsWithPlans(ids as string[]);
      const today = new Date();
      today.setHours(0,0,0,0);
      const dueIds = (planRows || [])
        .filter((p: any) => p.status !== "done" && p.due_date && new Date(p.due_date) < today)
        .map((p: any) => p.risk_id)
        .filter(Boolean);
      setRiskIdsWithPlansDue(Array.from(new Set(dueIds)) as string[]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Organization error", description: e?.message || "Failed to resolve organization" });
      setRisks([]);
    }
  }, []);

  const fetchOwners = useCallback(async () => {
    try {
      const orgId = await getRequiredOrgId();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("org_id", orgId)
        .order("full_name", { ascending: true });
      setOwners(((data ?? []) as UserProfile[]));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Organization error", description: e?.message || "Failed to resolve organization" });
      setOwners([]);
    }
  }, []);

  const filterRisks = useCallback(() => {
    let filtered = [...risks];

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        (r.title?.toLowerCase().includes(q)) || (r.id?.toLowerCase().includes(q))
      );
    }

    if (noPlansOnly) {
      const withPlans = new Set(riskIdsWithPlans);
      filtered = filtered.filter((r) => !withPlans.has(r.id));
    }

    if (plansDueOnly) {
      const withDue = new Set(riskIdsWithPlansDue);
      filtered = filtered.filter((r) => withDue.has(r.id));
    }

    if (newLast30Only) {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => r.created_at && new Date(r.created_at) >= start);
    }

    if (closedLast30Only) {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => (r as any).closure_date && new Date((r as any).closure_date) >= start);
    }

    // Above Appetite Only: open risks with residual score >= appetite
    if (aboveAppetiteOnly) {
      filtered = filtered.filter((r) => r.status === "open" && (r.score ?? 0) >= riskAppetite);
    }

    if (ownerFilter !== "all") {
      if (ownerFilter === "unassigned") {
        filtered = filtered.filter((r) => !r.owner);
      } else {
        filtered = filtered.filter((r) => r.owner === ownerFilter);
      }
    }

    if (severityFilter !== "all") {
      const toSeverity = (score?: number | null) => {
        const s = score ?? 0;
        if (s >= 16) return "critical";
        if (s >= 12) return "high";
        if (s >= 8) return "medium";
        return "low";
      };
      filtered = filtered.filter((r) => toSeverity(r.score) === severityFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let av: number | Date;
      let bv: number | Date;
      if (sortBy === "score") {
        av = a.score ?? -Infinity;
        bv = b.score ?? -Infinity;
      } else if (sortBy === "next_review_date") {
        const maxDate = new Date(8640000000000000);
        av = a.next_review_date ? new Date(a.next_review_date) : maxDate;
        bv = b.next_review_date ? new Date(b.next_review_date) : maxDate;
      } else {
        av = a.created_at ? new Date(a.created_at) : new Date(0);
        bv = b.created_at ? new Date(b.created_at) : new Date(0);
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortOrder === "asc" ? cmp : -cmp;
    });

    setFilteredRisks(filtered);
    setCurrentPage(1);
  }, [risks, searchQuery, statusFilter, noPlansOnly, riskIdsWithPlans, sortBy, sortOrder, aboveAppetiteOnly, ownerFilter, severityFilter, plansDueOnly, riskIdsWithPlansDue, riskAppetite, newLast30Only, closedLast30Only]);

  const handleRowClick = (risk: Risk) => {
    setSelectedRisk(risk);
    setDetailOpen(true);
  };

  const canEdit = role === "admin" || role === "manager";

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id); else set.delete(id);
      return Array.from(set);
    });
  };

  const bulkClose = async () => {
    try {
      const orgId = await getRequiredOrgId();
      const { error } = await supabase
        .from("risks")
        .update({ status: "closed" })
        .in("id", selectedIds)
        .eq("org_id", orgId);
      if (error) throw error;
      toast({ title: "Updated", description: "Selected risks closed" });
      setSelectedIds([]);
      await fetchRisks();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Bulk close failed";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const exportRisksCsv = async () => {
    try {
      const orgId = await getRequiredOrgId();
      const list = filteredRisks.length ? filteredRisks : risks;
      const riskIds = list.map((r) => r.id);
      const evidenceByRisk: Record<string, string[]> = {};
      if (riskIds.length > 0) {
        const { data: rc } = await supabase
          .from("risk_controls")
          .select("risk_id, control_id")
          .in("risk_id", riskIds)
          .eq("org_id", orgId);
        const controlsByRisk: Record<string, string[]> = {};
        const controlIds: string[] = [];
        for (const row of (rc || [])) {
          const rid = (row as any).risk_id;
          const cid = (row as any).control_id;
          if (!controlsByRisk[rid]) controlsByRisk[rid] = [];
          controlsByRisk[rid].push(cid);
          controlIds.push(cid);
        }
        const uniqControlIds = Array.from(new Set(controlIds));
        let evidences: any[] = [];
        if (uniqControlIds.length > 0) {
          const { data: ev } = await supabase
            .from("control_evidences")
            .select("control_id, file_url")
            .in("control_id", uniqControlIds)
            .eq("org_id", orgId);
          evidences = (ev || []) as any[];
        }
        const filesByControl: Record<string, string[]> = {};
        for (const e of evidences) {
          const cid = (e as any).control_id;
          const url = (e as any).file_url;
          if (!filesByControl[cid]) filesByControl[cid] = [];
          filesByControl[cid].push(url);
        }
        for (const rid of riskIds) {
          const cids = controlsByRisk[rid] || [];
          const files: string[] = [];
          for (const cid of cids) {
            for (const u of (filesByControl[cid] || [])) files.push(u);
          }
          evidenceByRisk[rid] = Array.from(new Set(files));
        }
      }
      const header = [
        "Title",
        "Owner",
        "Likelihood",
        "Impact",
        "Score",
        "Status",
        "Created",
        "Updated",
        "Acceptance Status",
        "Acceptance Approver",
        "Acceptance Requested",
        "Acceptance Decided",
        "Acceptance Expiry",
        "Acceptance Rationale",
        "Evidence Files",
      ];
      const rows = list.map((r: any) => [
        r.title || "",
        r.profiles?.full_name || "Unassigned",
        r.likelihood ?? "",
        r.impact ?? "",
        r.score ?? "",
        r.status || "",
        r.created_at ? new Date(r.created_at).toISOString() : "",
        r.updated_at ? new Date(r.updated_at).toISOString() : "",
        r.acceptance_status || "",
        r.acceptance_approver || "",
        r.acceptance_requested_at || "",
        r.acceptance_decided_at || "",
        r.acceptance_expiry || "",
        r.acceptance_rationale || "",
        (evidenceByRisk[r.id] || []).join(";")
      ]);
      const csv = [header.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `risks-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export failed", description: e?.message || "Failed to export" });
    }
  };

  const exportRisksJson = async () => {
    try {
      const orgId = await getRequiredOrgId();
      const list = filteredRisks.length ? filteredRisks : risks;
      const riskIds = list.map((r) => r.id);
      const evidenceByRisk: Record<string, string[]> = {};
      if (riskIds.length > 0) {
        const { data: rc } = await supabase
          .from("risk_controls")
          .select("risk_id, control_id")
          .in("risk_id", riskIds)
          .eq("org_id", orgId);
        const controlsByRisk: Record<string, string[]> = {};
        const controlIds: string[] = [];
        for (const row of (rc || [])) {
          const rid = (row as any).risk_id;
          const cid = (row as any).control_id;
          if (!controlsByRisk[rid]) controlsByRisk[rid] = [];
          controlsByRisk[rid].push(cid);
          controlIds.push(cid);
        }
        const uniqControlIds = Array.from(new Set(controlIds));
        let evidences: any[] = [];
        if (uniqControlIds.length > 0) {
          const { data: ev } = await supabase
            .from("control_evidences")
            .select("control_id, file_url")
            .in("control_id", uniqControlIds)
            .eq("org_id", orgId);
          evidences = (ev || []) as any[];
        }
        const filesByControl: Record<string, string[]> = {};
        for (const e of evidences) {
          const cid = (e as any).control_id;
          const url = (e as any).file_url;
          if (!filesByControl[cid]) filesByControl[cid] = [];
          filesByControl[cid].push(url);
        }
        for (const rid of riskIds) {
          const cids = controlsByRisk[rid] || [];
          const files: string[] = [];
          for (const cid of cids) {
            for (const u of (filesByControl[cid] || [])) files.push(u);
          }
          evidenceByRisk[rid] = Array.from(new Set(files));
        }
      }
      const payload = list.map((r: any) => ({
        id: r.id,
        title: r.title || "",
        owner_name: r.profiles?.full_name || null,
        likelihood: r.likelihood ?? null,
        impact: r.impact ?? null,
        score: r.score ?? null,
        status: r.status || "",
        created_at: r.created_at || null,
        updated_at: r.updated_at || null,
        acceptance_status: r.acceptance_status || "",
        acceptance_approver: r.acceptance_approver || null,
        acceptance_requested_at: r.acceptance_requested_at || null,
        acceptance_decided_at: r.acceptance_decided_at || null,
        acceptance_expiry: r.acceptance_expiry || null,
        acceptance_rationale: r.acceptance_rationale || null,
        evidence_files: evidenceByRisk[r.id] || []
      }));
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `risks-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export failed", description: e?.message || "Failed to export" });
    }
  };

  const bulkAssign = async (ownerId: string) => {
    try {
      const orgId = await getRequiredOrgId();
      const { error } = await supabase
        .from("risks")
        .update({ owner: ownerId })
        .in("id", selectedIds)
        .eq("org_id", orgId);
      if (error) throw error;
      toast({ title: "Updated", description: "Selected risks assigned" });
      setSelectedIds([]);
      await fetchRisks();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Bulk assign failed";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  // Initialize filters from query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get("filter");
    if (filter === "above_appetite") {
      setStatusFilter("open");
      setAboveAppetiteOnly(true);
      setSortBy("score");
      setSortOrder("desc");
    }
    if (filter === "plans_due") {
      setPlansDueOnly(true);
      setStatusFilter("all");
    }
    if (filter === "new_last_30") {
      setNewLast30Only(true);
      setStatusFilter("all");
    }
    if (filter === "closed_last_30") {
      setClosedLast30Only(true);
      setStatusFilter("closed");
    }
  }, [location.search]);

  // Load risk appetite threshold
  useEffect(() => {
    (async () => {
      try {
        const orgId = await getRequiredOrgId();
        const { data: org } = await supabase
          .from("organizations")
          .select("risk_appetite_threshold")
          .eq("id", orgId)
          .single();
        if (org?.risk_appetite_threshold) setRiskAppetite(org.risk_appetite_threshold);
      } catch { void 0; }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Risks</h2>
          <p className="text-muted-foreground">Manage and track organizational risks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportRisksCsv}>
            <FileDown className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={exportRisksJson}>
            <FileDown className="h-4 w-4 mr-2" /> Export JSON
          </Button>
          {canEdit && (
            <Button onClick={() => setDialogOpen(true)} disabled={!!limits && !!counts && counts.risks >= limits.max_risks} title={limits && counts && counts.risks >= limits.max_risks ? 'Risk limit reached — upgrade in Settings' : undefined}>
              <Plus className="h-4 w-4 mr-2" />
              Add Risk
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            {limits && counts && counts.risks >= limits.max_risks && (
              <div className="w-full rounded border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm">
                Risk limit reached for your plan. Visit Settings to upgrade.
              </div>
            )}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search risks..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.full_name || o.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">No Treatment Plans</span>
              <Switch checked={noPlansOnly} onCheckedChange={setNoPlansOnly} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Above Appetite Only</span>
              <Switch checked={aboveAppetiteOnly} onCheckedChange={setAboveAppetiteOnly} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Plans Due Only</span>
              <Switch checked={plansDueOnly} onCheckedChange={setPlansDueOnly} />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created</SelectItem>
                  <SelectItem value="score">Residual Score</SelectItem>
                  <SelectItem value="next_review_date">Next Review</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="w-[44px]"
                onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
              >
                {sortOrder === "asc" ? (
                  <ArrowUpNarrowWide className="h-4 w-4" />
                ) : (
                  <ArrowDownWideNarrow className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {canEdit && selectedIds.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <Button variant="outline" onClick={bulkClose}>Close Selected</Button>
              <Select onValueChange={(ownerId) => bulkAssign(ownerId)}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Assign owner" /></SelectTrigger>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.full_name || o.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {canEdit && <TableHead className="w-[40px]">Select</TableHead>}
                <TableHead>Title</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-center">Residual Likelihood</TableHead>
                <TableHead className="text-center">Residual Impact</TableHead>
                <TableHead className="text-center">Residual Score</TableHead>
                <TableHead className="text-center">Next Review</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRisks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No risks found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRisks
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((risk) => (
                  <TableRow
                    key={risk.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(risk)}
                  >
                    {canEdit && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(risk.id)}
                          onCheckedChange={(v) => toggleSelected(risk.id, !!v)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{risk.title}</TableCell>
                    <TableCell>{risk.profiles?.full_name || "Unassigned"}</TableCell>
                    <TableCell className="text-center">{risk.likelihood || "-"}</TableCell>
                    <TableCell className="text-center">{risk.impact || "-"}</TableCell>
                    <TableCell className="text-center font-bold">
                      {risk.score || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const next = risk.next_review_date ? new Date(risk.next_review_date) : null;
                        if (!next) return <span className="text-muted-foreground">Not set</span>;
                        const now = new Date();
                        next.setHours(0,0,0,0);
                        now.setHours(0,0,0,0);
                        const overdue = next < now;
                        const msPerDay = 24 * 60 * 60 * 1000;
                        const daysLeft = Math.max(0, Math.round((next.getTime() - now.getTime()) / msPerDay));
                        const tone = overdue
                          ? "text-red-700"
                          : daysLeft <= 7
                          ? "text-red-700"
                          : daysLeft <= 14
                          ? "text-amber-700"
                          : "text-muted-foreground";
                        return (
                          <span className={tone}>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-4 w-4" />
                              {overdue ? "Overdue" : `${daysLeft}d`}
                            </span>
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          risk.status === "open"
                            ? "bg-red-100 text-red-700"
                            : risk.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {risk.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Page size:
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="ml-2 w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10,20,50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e)=>{e.preventDefault(); setCurrentPage((p)=>Math.max(1,p-1));}} />
                </PaginationItem>
                {Array.from({ length: Math.max(1, Math.ceil(filteredRisks.length / pageSize)) }).slice(0,5).map((_, idx) => {
                  const page = idx + 1;
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink href="#" isActive={page === currentPage} onClick={(e)=>{e.preventDefault(); setCurrentPage(page);}}>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e)=>{e.preventDefault(); const total = Math.max(1, Math.ceil(filteredRisks.length / pageSize)); setCurrentPage((p)=>Math.min(total,p+1));}} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <RiskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchRisks}
      />

      <RiskDetail
        risk={selectedRisk}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={fetchRisks}
        canEdit={canEdit}
      />
    </div>
  );
};

export default Risks;
