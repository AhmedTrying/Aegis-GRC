import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, AlertTriangle, FileWarning, Flame } from "lucide-react";
import { RiskDialog } from "@/components/RiskDialog";
import { TreatmentPlanDialog } from "@/components/TreatmentPlanDialog";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

interface RiskDetailProps {
  risk: Tables<"risks">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  canEdit: boolean;
}

type TreatPlanRow = Tables<"treatment_plans"> & { profiles?: { full_name?: string | null } | null };
type AcceptanceLogRow = Tables<"risk_acceptance_logs"> & { profiles?: { full_name?: string | null } | null };
type FindingRow = Tables<"findings"> & { profiles?: { full_name?: string | null } | null };
type TaskRow = Tables<"tasks"> & { profiles?: { full_name?: string | null } | null };
type RiskControlLink = { risk_id: string; control_id: string; controls: Tables<"controls"> };
type RiskPolicyLink = { risk_id: string; policy_id: string; policies: Tables<"policies"> };

export const RiskDetail = ({ risk, open, onOpenChange, onUpdate, canEdit }: RiskDetailProps) => {
  const RISK_APPETITE_THRESHOLD = 12; // residual score threshold for appetite cue
  const CADENCE_DAYS = 90; // default review cadence in days
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatPlanRow | null>(null);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatPlanRow[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [delegateProfile, setDelegateProfile] = useState<Tables<"profiles"> | null>(null);
  const { role } = useUserRole();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reviewConfirmOpen, setReviewConfirmOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  // Acceptance workflow state
  const [acceptanceLogs, setAcceptanceLogs] = useState<AcceptanceLogRow[]>([]);
  const [acceptFormOpen, setAcceptFormOpen] = useState(false);
  const [approvers, setApprovers] = useState<Tables<"profiles">[]>([]);
  const [acceptForm, setAcceptForm] = useState({
    approver: "",
    rationale: "",
    expiry: "",
  });
  const [deciding, setDeciding] = useState(false);
  const [decisionComment, setDecisionComment] = useState("");
  const [acceptanceReminderDay, setAcceptanceReminderDay] = useState<number | null>(null);

  // Linkage state
  const [linkedControls, setLinkedControls] = useState<RiskControlLink[]>([]);
  const [linkedPolicies, setLinkedPolicies] = useState<RiskPolicyLink[]>([]);
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [relatedTasks, setRelatedTasks] = useState<TaskRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [controlsList, setControlsList] = useState<Tables<"controls">[]>([]);
  const [policiesList, setPoliciesList] = useState<Tables<"policies">[]>([]);
  const [reviewLogs, setReviewLogs] = useState<Record<string, unknown>[]>([]);
  const [newControlId, setNewControlId] = useState<string>("");
  const [newPolicyId, setNewPolicyId] = useState<string>("");
  const [newFinding, setNewFinding] = useState({
    title: "",
    description: "",
    severity: "medium",
    status: "open",
    owner: "",
    sla_due_date: "",
  });
  const [newTask, setNewTask] = useState({
    title: "",
    assigned_to: "",
    due_date: "",
  });
  const [taskLinkTarget, setTaskLinkTarget] = useState<string>("risk");
  const [taskPlanId, setTaskPlanId] = useState<string>("");
  const [findingsFilter, setFindingsFilter] = useState<string>("all");
  const [tasksFilter, setTasksFilter] = useState<string>("all");
  const [myTasksOnly, setMyTasksOnly] = useState<boolean>(false);

  const fetchTreatmentPlans = useCallback(async () => {
    if (!risk) return;
    const orgId = await getRequiredOrgId();
    const { data, error } = await supabase
      .from("treatment_plans")
      .select("*, profiles!treatment_plans_responsible_user_fkey(full_name)")
      .eq("risk_id", risk.id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch treatment plans" });
    } else if (data) {
      setTreatmentPlans((data ?? []) as TreatPlanRow[]);
    }
  }, [risk?.id]);

  const fetchDelegateProfile = useCallback(async () => {
    if (!risk?.delegate_owner) {
      setDelegateProfile(null);
      return;
    }
    const orgId = await getRequiredOrgId();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", risk.delegate_owner)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!error) setDelegateProfile((data ?? null) as Tables<"profiles"> | null);
  }, [risk?.delegate_owner]);

  const fetchAcceptanceLogs = useCallback(async () => {
    const orgId = await getRequiredOrgId();
    const { data, error } = await supabase
      .from("risk_acceptance_logs")
      .select("*, profiles!risk_acceptance_logs_actor_fkey(full_name)")
      .eq("risk_id", risk.id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (!error && data) setAcceptanceLogs((data ?? []) as AcceptanceLogRow[]);
  }, [risk?.id]);

  const fetchReviewLogs = useCallback(async () => {
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("risk_review_logs")
      .select("*, profiles!risk_review_logs_reviewer_fkey(full_name)")
      .eq("risk_id", risk.id)
      .eq("org_id", orgId)
      .order("reviewed_at", { ascending: false });
    setReviewLogs((data ?? []) as Record<string, unknown>[]);
  }, [risk?.id]);

  const fetchAuditLogs = useCallback(async () => {
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("audit_logs")
      .select("id, actor_email, entity_type, entity_id, action, created_at, before_data, after_data")
      .eq("org_id", orgId)
      .eq("entity_type", "risks")
      .eq("entity_id", risk.id)
      .order("created_at", { ascending: false });
    setAuditLogs(((data ?? []) as any[]));
  }, [risk?.id]);

  const fetchApprovers = useCallback(async () => {
    const orgId = await getRequiredOrgId();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("org_id", orgId);
    if (!error && data) {
      const eligible = ((data ?? []) as Tables<"profiles">[]).filter((p) => (p.role === "admin" || p.role === "manager") && p.id !== currentUserId);
      setApprovers(eligible);
    }
  }, [currentUserId]);

  const preloadLists = useCallback(async () => {
    const orgId = await getRequiredOrgId();
    const { data: cl } = await supabase
      .from("controls")
      .select("id, code, description, status")
      .eq("org_id", orgId)
      .order("code");
    setControlsList(((cl ?? []) as Tables<"controls">[]));
    const { data: pl } = await supabase
      .from("policies")
      .select("id, name, version, status")
      .eq("org_id", orgId)
      .order("name");
    setPoliciesList(((pl ?? []) as Tables<"policies">[]));
  }, []);

  const fetchLinkages = useCallback(async () => {
    const orgId = await getRequiredOrgId();
    const { data: rc } = await supabase
      .from("risk_controls")
      .select("risk_id, control_id, controls(id, code, description, status, evidence_url)")
      .eq("risk_id", risk.id)
      .eq("org_id", orgId);
    setLinkedControls(((rc ?? []) as RiskControlLink[]));

    const { data: rp } = await supabase
      .from("risk_policies")
      .select("risk_id, policy_id, policies(id, name, version, status)")
      .eq("risk_id", risk.id)
      .eq("org_id", orgId);
    setLinkedPolicies(((rp ?? []) as RiskPolicyLink[]));
  }, [risk?.id]);

  const fetchFindings = useCallback(async () => {
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("findings")
      .select("*, profiles!findings_owner_fkey(full_name)")
      .eq("risk_id", risk.id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setFindings(((data ?? []) as FindingRow[]));
  }, [risk?.id]);

  const fetchRelatedTasks = useCallback(async () => {
    const orgId = await getRequiredOrgId();
    // Tasks directly linked to this risk
    const { data: riskTasks } = await supabase
      .from("tasks")
      .select("*, profiles!tasks_assigned_to_fkey(full_name)")
      .eq("related_type", "risk")
      .eq("related_id", risk.id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    // Tasks linked to treatment plans under this risk
    const { data: planRows } = await supabase
      .from("treatment_plans")
      .select("id")
      .eq("risk_id", risk.id)
      .eq("org_id", orgId);
    const planIds = (planRows ?? []).map((p: { id: string }) => p.id);

    let planTasks: TaskRow[] = [];
    if (planIds.length > 0) {
      const { data: pt } = await supabase
        .from("tasks")
        .select("*, profiles!tasks_assigned_to_fkey(full_name)")
        .eq("related_type", "treatment_plan")
        .in("related_id", planIds)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      planTasks = ((pt ?? []) as TaskRow[]);
    }

    const combined = [
      ...(((riskTasks ?? []) as TaskRow[])),
      ...planTasks,
    ];
    // Sort newest first
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRelatedTasks(combined);
  }, [risk?.id]);

  const loadAll = useCallback(() => {
    if (!risk || !open) return;
    fetchTreatmentPlans();
    fetchDelegateProfile();
    fetchAcceptanceLogs();
    fetchReviewLogs();
    fetchAuditLogs();
    fetchApprovers();
    fetchLinkages();
    fetchFindings();
    fetchRelatedTasks();
    preloadLists();
  }, [risk, open, fetchTreatmentPlans, fetchDelegateProfile, fetchAcceptanceLogs, fetchReviewLogs, fetchAuditLogs, fetchApprovers, fetchLinkages, fetchFindings, fetchRelatedTasks, preloadLists]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Show acceptance reminders at 14/7/1 days before expiry when panel is open
  useEffect(() => {
    if (!risk || !open) return;
    const status = risk.acceptance_status || "none";
    if (!(status === "requested" || status === "accepted")) return;
    if (!risk.acceptance_expiry) return;
    const today = new Date();
    const expiry = new Date(risk.acceptance_expiry);
    // normalize to date-only
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.max(0, Math.round((expiry.getTime() - today.getTime()) / msPerDay));
    const remindDays = [14, 7, 1];
    if (remindDays.includes(daysLeft) && acceptanceReminderDay !== daysLeft) {
      toast({
        title: `${daysLeft} day${daysLeft === 1 ? "" : "s"} until acceptance expiry`,
        description: "Consider renewing or closing this acceptance.",
      });
      setAcceptanceReminderDay(daysLeft);
    }
  }, [risk, open, acceptanceReminderDay]);

  useEffect(() => {
    // Capture current user for approval gating
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  

  

  

  

  

  

  

  

  

  const handleDeletePlan = async () => {
    if (!planToDelete) return;

    const orgId = await getRequiredOrgId();
    const { error } = await supabase
      .from("treatment_plans")
      .delete()
      .eq("id", planToDelete)
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
        description: "Treatment plan deleted",
      });
      fetchTreatmentPlans();
    }

    setDeleteDialogOpen(false);
    setPlanToDelete(null);
  };

  const handleEditPlan = (plan: any) => {
    setSelectedPlan(plan);
    setPlanDialogOpen(true);
  };

  const handleAddPlan = () => {
    setSelectedPlan(null);
    setPlanDialogOpen(true);
  };

  const handleMarkReviewed = async () => {
    const now = new Date();
    const currentNext = risk.next_review_date ? new Date(risk.next_review_date) : null;
    const baseDate = currentNext && !Number.isNaN(currentNext.getTime()) ? currentNext : now;
    const next = new Date(baseDate);
    next.setDate(baseDate.getDate() + CADENCE_DAYS);

    const orgId = await getRequiredOrgId();
    const { error: updErr } = await supabase
      .from("risks")
      .update({ last_reviewed_at: now.toISOString(), next_review_date: next.toISOString().slice(0, 10) })
      .eq("id", risk.id)
      .eq("org_id", orgId);

    const { error: logErr } = await supabase
      .from("risk_review_logs")
      .insert({
        risk_id: risk.id,
        reviewer: currentUserId,
        reviewed_at: now.toISOString(),
        note: reviewNote || null,
        org_id: orgId,
      });

    if (updErr || logErr) {
      toast({ variant: "destructive", title: "Error", description: updErr?.message || logErr?.message });
    } else {
      toast({ title: "Marked reviewed", description: `Next review advanced by ${CADENCE_DAYS} days.` });
      // Refresh review timeline immediately
      fetchReviewLogs();
      onUpdate();
      setReviewNote("");
    }
  };

  const handleRequestAcceptance = async () => {
    if (role === "viewer") {
      toast({ variant: "destructive", title: "Not allowed", description: "Viewers cannot request acceptance." });
      return;
    }
    if (!acceptForm.approver || !acceptForm.rationale || !acceptForm.expiry) {
      toast({ variant: "destructive", title: "Missing fields", description: "Approver, rationale, and expiry are required." });
      return;
    }
    if (currentUserId && acceptForm.approver === currentUserId) {
      toast({ variant: "destructive", title: "Conflict of duty", description: "Requester cannot select themselves as approver." });
      return;
    }
    const now = new Date().toISOString();
    const orgId = await getRequiredOrgId();
    const { error: updateErr } = await supabase
      .from("risks")
      .update({
        acceptance_status: "requested",
        acceptance_approver: acceptForm.approver,
        acceptance_rationale: acceptForm.rationale,
        acceptance_expiry: acceptForm.expiry,
        acceptance_requester: currentUserId,
        acceptance_requested_at: now,
      })
      .eq("id", risk.id)
      .eq("org_id", orgId);

    const { error: logErr } = await supabase
      .from("risk_acceptance_logs")
      .insert({
        risk_id: risk.id,
        actor: currentUserId,
        action: "requested",
        rationale: acceptForm.rationale,
        expiry: acceptForm.expiry,
        org_id: orgId,
      });

    // Create a notification task for the approver
    try {
      await supabase
        .from("tasks")
        .insert({
          title: "Review risk acceptance",
          assigned_to: acceptForm.approver,
          related_type: "risk",
          related_id: risk.id,
          due_date: acceptForm.expiry || null,
          status: "open",
          org_id: orgId,
        });
    } catch (e) {
      // Non-blocking: ignore task creation failures
    }

    if (updateErr || logErr) {
      const msg = updateErr?.message || logErr?.message || "Unknown error";
      const friendly = msg.includes("risks_sod_acceptance")
        ? "Requester cannot be the same as approver. Please choose a different approver."
        : msg;
      toast({ variant: "destructive", title: "Error", description: friendly });
    } else {
      toast({ title: "Acceptance requested", description: "The request has been logged." });
      setAcceptFormOpen(false);
      setAcceptForm({ approver: "", rationale: "", expiry: "" });
      fetchAcceptanceLogs();
      onUpdate();
    }
  };

  const handleApproveAcceptance = async () => {
    const isEligibleApprover = ((role === "admin" || role === "manager") && !!currentUserId && risk.acceptance_approver === currentUserId);
    if (!isEligibleApprover) {
      toast({ variant: "destructive", title: "Not allowed", description: "Only the designated approver (admin/manager) can approve." });
      return;
    }
    if (!risk.acceptance_rationale || !risk.acceptance_expiry) {
      toast({ variant: "destructive", title: "Missing fields", description: "Rationale and expiry are required to approve." });
      return;
    }
    // Segregation of duties: requester cannot approve
    const latestRequested = acceptanceLogs.find((l) => l.action === "requested");
    if (latestRequested && latestRequested.actor === currentUserId) {
      toast({ variant: "destructive", title: "Conflict of duty", description: "Requester cannot approve their own request." });
      return;
    }
    setDeciding(true);
    const now = new Date().toISOString();
    const orgId = await getRequiredOrgId();
    const { error: updateErr } = await supabase
      .from("risks")
      .update({
        acceptance_status: "accepted",
        acceptance_decided_at: now,
      })
      .eq("id", risk.id)
      .eq("org_id", orgId);

    const { error: logErr } = await supabase
      .from("risk_acceptance_logs")
      .insert({
        risk_id: risk.id,
        actor: currentUserId,
        action: "accepted",
        rationale: decisionComment || risk.acceptance_rationale || null,
        expiry: risk.acceptance_expiry || null,
        org_id: orgId,
      });

    // Notify the risk owner via a task
    try {
      await supabase
        .from("tasks")
        .insert({
          title: "Acceptance approved",
          assigned_to: risk.owner || null,
          related_type: "risk",
          related_id: risk.id,
          due_date: risk.acceptance_expiry || null,
          status: "open",
          org_id: orgId,
        });
    } catch (e) {
      // Non-blocking
    }

    if (updateErr || logErr) {
      toast({ variant: "destructive", title: "Error", description: updateErr?.message || logErr?.message });
    } else {
      toast({ title: "Risk approved", description: "Acceptance status updated and logged." });
      fetchAcceptanceLogs();
      onUpdate();
    }
    setDeciding(false);
  };

  const handleRejectAcceptance = async () => {
    const isEligibleApprover = ((role === "admin" || role === "manager") && !!currentUserId && risk.acceptance_approver === currentUserId);
    if (!isEligibleApprover) {
      toast({ variant: "destructive", title: "Not allowed", description: "Only the designated approver (admin/manager) can reject." });
      return;
    }
    // Segregation of duties: requester cannot reject
    const latestRequested = acceptanceLogs.find((l) => l.action === "requested");
    if (latestRequested && latestRequested.actor === currentUserId) {
      toast({ variant: "destructive", title: "Conflict of duty", description: "Requester cannot reject their own request." });
      return;
    }
    setDeciding(true);
    const now = new Date().toISOString();
    const orgId = await getRequiredOrgId();
    const { error: updateErr } = await supabase
      .from("risks")
      .update({
        acceptance_status: "rejected",
        acceptance_decided_at: now,
      })
      .eq("id", risk.id)
      .eq("org_id", orgId);

    const { error: logErr } = await supabase
      .from("risk_acceptance_logs")
      .insert({
        risk_id: risk.id,
        action: "rejected",
        actor: currentUserId,
        rationale: decisionComment || risk.acceptance_rationale || null,
        expiry: risk.acceptance_expiry || null,
        org_id: orgId,
      });

    // Notify the risk owner via a task
    try {
      await supabase
        .from("tasks")
        .insert({
          title: "Acceptance rejected",
          assigned_to: risk.owner || null,
          related_type: "risk",
          related_id: risk.id,
          due_date: null,
          status: "open",
          org_id: orgId,
        });
    } catch (e) {
      // Non-blocking
    }

    if (updateErr || logErr) {
      toast({ variant: "destructive", title: "Error", description: updateErr?.message || logErr?.message });
    } else {
      toast({ title: "Risk rejected", description: "Acceptance status updated and logged." });
      fetchAcceptanceLogs();
      onUpdate();
    }
    setDeciding(false);
  };

  const handleLinkControl = async () => {
    if (!newControlId) return;
    const orgId = await getRequiredOrgId();
    const { error } = await supabase
      .from("risk_controls")
      .insert({ risk_id: risk.id, control_id: newControlId, org_id: orgId });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Linked", description: "Control linked to risk." });
      setNewControlId("");
      fetchLinkages();
    }
  };

  const handleUnlinkControl = async (controlId: string) => {
    const orgId = await getRequiredOrgId();
    const { error } = await supabase
      .from("risk_controls")
      .delete()
      .eq("risk_id", risk.id)
      .eq("control_id", controlId)
      .eq("org_id", orgId);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Unlinked", description: "Control unlinked." });
      fetchLinkages();
    }
  };

  const handleUploadEvidenceInline = async (controlId: string) => {
    if (role === "viewer") {
      toast({ variant: "destructive", title: "Not allowed", description: "Viewers cannot upload evidence." });
      return;
    }
    const url = window.prompt("Enter evidence URL (link to doc, ticket, or file)");
    if (!url) return;
    const orgId = await getRequiredOrgId();
    const { error } = await supabase
      .from("controls")
      .update({ evidence_url: url })
      .eq("id", controlId)
      .eq("org_id", orgId);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Evidence uploaded", description: "Control evidence URL saved." });
      fetchLinkages();
    }
  };

  const handleLinkPolicy = async () => {
    if (!newPolicyId) return;
    const orgId = await getRequiredOrgId();
    const { error } = await supabase
      .from("risk_policies")
      .insert({ risk_id: risk.id, policy_id: newPolicyId, org_id: orgId });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Linked", description: "Policy linked to risk." });
      setNewPolicyId("");
      fetchLinkages();
    }
  };

  const handleUnlinkPolicy = async (policyId: string) => {
    const orgId = await getRequiredOrgId();
    const { error } = await supabase
      .from("risk_policies")
      .delete()
      .eq("risk_id", risk.id)
      .eq("policy_id", policyId)
      .eq("org_id", orgId);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Unlinked", description: "Policy unlinked." });
      fetchLinkages();
    }
  };

  const handleAddFinding = async () => {
    if (!newFinding.title) {
      toast({ variant: "destructive", title: "Missing title", description: "Finding title is required." });
      return;
    }
    if (!newFinding.owner) {
      toast({ variant: "destructive", title: "Owner required", description: "Please assign an Owner before adding a finding." });
      return;
    }
    if (!newFinding.sla_due_date) {
      toast({ variant: "destructive", title: "SLA due date required", description: "Please set an SLA due date for this finding." });
      return;
    }
    const orgId = await getRequiredOrgId();
    const { error } = await supabase
      .from("findings")
      .insert({
        risk_id: risk.id,
        title: newFinding.title,
        description: newFinding.description,
        severity: newFinding.severity,
        status: newFinding.status,
        owner: newFinding.owner,
        sla_due_date: newFinding.sla_due_date,
        org_id: orgId,
      });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Finding added", description: "Incident/finding recorded." });
      setNewFinding({ title: "", description: "", severity: "medium", status: "open", owner: "", sla_due_date: "" });
      fetchFindings();
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title) {
      toast({ variant: "destructive", title: "Missing title", description: "Task title is required." });
      return;
    }
    if (!newTask.assigned_to || !newTask.due_date) {
      toast({ variant: "destructive", title: "Assignee and due date required", description: "Please set both Assignee and Due Date before creating a task." });
      return;
    }
    const orgId = await getRequiredOrgId();
    // Determine link target
    const related_type = taskLinkTarget === "treatment_plan" && taskPlanId ? "treatment_plan" : "risk";
    const related_id = related_type === "treatment_plan" ? taskPlanId : risk.id;

    const { error } = await supabase
      .from("tasks")
      .insert({
        title: newTask.title,
        assigned_to: newTask.assigned_to,
        related_type,
        related_id,
        due_date: newTask.due_date,
        status: "open",
        org_id: orgId,
      });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Task created", description: related_type === "treatment_plan" ? "Task linked to treatment plan." : "Task linked to risk." });
      setNewTask({ title: "", assigned_to: "", due_date: "" });
      setTaskPlanId("");
      setTaskLinkTarget("risk");
      fetchRelatedTasks();
    }
  };

  const updatePlanFields = async (planId: string, fields: Record<string, any>) => {
    const orgId = await getRequiredOrgId();
    const { error } = await supabase
      .from("treatment_plans")
      .update(fields)
      .eq("id", planId)
      .eq("org_id", orgId);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      fetchTreatmentPlans();
    }
  };

  const handleProgressChange = async (planId: string, value: number) => {
    await updatePlanFields(planId, { progress: Math.max(0, Math.min(100, Math.round(value))) });
  };

  const handleBlockedChange = async (planId: string, blocked: boolean) => {
    await updatePlanFields(planId, { blocked });
  };

  const handleBlockedReasonChange = async (planId: string, reason: string) => {
    await updatePlanFields(planId, { blocked_reason: reason });
  };

  if (!risk) return null;
  const allPlansDone = treatmentPlans.length > 0 && treatmentPlans.every((p) => p.status === "done");
  const latestDecision = acceptanceLogs.find((l) => l.action === "accepted" || l.action === "rejected" || l.action === "requested");
  const rawStatus = latestDecision?.action || (risk.acceptance_status || "none");
  const displayStatus = (() => {
    if (rawStatus === "requested") return risk.acceptance_approver ? "under_review" : "requested";
    if (rawStatus === "accepted") return "approved";
    return rawStatus;
  })();
  const displayStatusLabel = (() => {
    if (displayStatus === "requested") return "Requested";
    if (displayStatus === "under_review") return "Under Review";
    if (displayStatus === "approved") return "Approved";
    if (displayStatus === "rejected") return "Rejected";
    return "—";
  })();
  const latestRequested = acceptanceLogs.find((l) => l.action === "requested");
  const requesterId = latestRequested?.actor || null;
  const canDecideAcceptance = ((role === "admin" || role === "manager")) && (!!currentUserId && risk.acceptance_approver === currentUserId) && (!requesterId || requesterId !== currentUserId);
  const controlsCount = linkedControls.length;
  const policiesCount = linkedPolicies.length;
  const findingsCount = findings.length;
  const tasksCount = relatedTasks.length;
  const approverProfile = approvers.find((p) => p.id === risk.acceptance_approver);
  const isExpired = risk.acceptance_status === "accepted" && !!risk.acceptance_expiry && new Date(risk.acceptance_expiry) < new Date();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-2xl">{risk.title}</SheetTitle>
                {(() => {
                  const residualScore = risk.score || ((risk.likelihood || 0) * (risk.impact || 0));
                  const aboveAppetite = residualScore >= RISK_APPETITE_THRESHOLD && risk.status !== "closed";
                  return aboveAppetite ? (
                    <Badge variant="destructive" className="text-xs inline-flex items-center gap-1">
                      <Flame className="h-3 w-3" /> Above appetite
                    </Badge>
                  ) : null;
                })()}
              </div>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </SheetHeader>
          
              <Card>
                <CardHeader>
                  <CardTitle>Risk Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {risk.inherent_likelihood && risk.inherent_impact ? (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const inherentScore = (risk.inherent_likelihood || 0) * (risk.inherent_impact || 0);
                        const residualScore = (risk.likelihood || 0) * (risk.impact || 0);
                        const reduction = inherentScore > 0 ? Math.round(((inherentScore - residualScore) / inherentScore) * 100) : 0;
                        return (
                          <Badge variant="outline" className={`text-xs ${allPlansDone ? "border-green-500 text-green-600" : ""}`}>
                            Inherent {risk.inherent_likelihood}×{risk.inherent_impact} → Residual {risk.likelihood}×{risk.impact} ({reduction}% reduction)
                          </Badge>
                        );
                      })()}
                      {(() => {
                        const residualHigher = (
                          (risk.inherent_likelihood && risk.likelihood && risk.likelihood > risk.inherent_likelihood) ||
                          (risk.inherent_impact && risk.impact && risk.impact > risk.inherent_impact)
                        );
                        return residualHigher ? (
                          <span className="inline-flex items-center gap-1 text-red-700 text-xs">
                            <AlertTriangle className="h-3 w-3" /> Residual exceeds inherent — review required
                          </span>
                        ) : null;
                      })()}
                    </div>
                  ) : null}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="mt-1">{risk.description || "No description"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Owner</p>
                      <p className="mt-1">{risk.profiles?.full_name || "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Delegate</p>
                      <p className="mt-1">{delegateProfile?.full_name || "None"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge
                        className="mt-1"
                        variant={
                          risk.status === "open"
                            ? "destructive"
                            : risk.status === "in_progress"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {risk.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Next Review</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span>{risk.next_review_date ? new Date(risk.next_review_date).toLocaleDateString() : "Not set"}</span>
                        {(() => {
                          if (!risk.next_review_date) return null;
                          const next = new Date(risk.next_review_date);
                          const now = new Date();
                          next.setHours(0,0,0,0);
                          now.setHours(0,0,0,0);
                          const overdue = next < now;
                          const msPerDay = 24 * 60 * 60 * 1000;
                          const daysLeft = Math.max(0, Math.round((next.getTime() - now.getTime()) / msPerDay));
                          return (
                            <>
                              {overdue ? (
                                <span className="inline-flex items-center text-red-600 text-xs">
                                  <AlertTriangle className="h-4 w-4 mr-1" /> Overdue
                                </span>
                              ) : (
                                <span className={`text-xs ${daysLeft <= 7 ? "text-red-600" : daysLeft <= 14 ? "text-amber-600" : "text-muted-foreground"}`}>{daysLeft} days left</span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {canEdit && (
                        <div className="mt-2">
                          <Button size="sm" variant="outline" onClick={() => setReviewConfirmOpen(true)}>Mark reviewed</Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {risk.inherent_likelihood && risk.inherent_impact ? (
                    <div className="mb-2">
                      {(() => {
                        const inherentScore = (risk.inherent_likelihood || 0) * (risk.inherent_impact || 0);
                        const residualScore = risk.score || ((risk.likelihood || 0) * (risk.impact || 0));
                        const reduction = inherentScore > 0 ? Math.round((1 - residualScore / inherentScore) * 100) : 0;
                        const color = reduction >= 50 ? "bg-green-100 text-green-700" : reduction >= 20 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
                        return (
                          <span className={`inline-block text-xs px-2 py-1 rounded ${color}`}>
                            Inherent {risk.inherent_likelihood}×{risk.inherent_impact} → Residual {risk.likelihood}×{risk.impact} ({reduction}% reduction)
                          </span>
                        );
                      })()}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Residual Likelihood</p>
                      <p className="text-2xl font-bold mt-1">{risk.likelihood}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Residual Impact</p>
                      <p className="text-2xl font-bold mt-1">{risk.impact}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Residual Score</p>
                      <p className={`text-2xl font-bold mt-1 ${allPlansDone ? "text-green-600" : "text-primary"}`}>{risk.score}</p>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <p className="mt-1">{risk.category || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Department</p>
                      <p className="mt-1">{risk.department || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Cause</p>
                      <p className="mt-1">{risk.cause || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Consequence</p>
                      <p className="mt-1">{risk.consequence || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Affected Asset/System</p>
                      <p className="mt-1">{risk.affected_asset || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created At</p>
                    <p className="mt-1">{new Date(risk.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Treatment Plans</CardTitle>
                    <div className="flex items-center gap-4">
                      {treatmentPlans.length > 0 && (
                        <div
                          className="hidden md:flex items-end gap-1 h-6"
                          title="Burn-up microchart: each bar shows a plan's current progress"
                        >
                          {treatmentPlans.map((p, idx) => {
                            const progress = typeof p.progress === "number" ? p.progress : 0;
                            const clamped = Math.max(0, Math.min(100, p.status === "done" ? 100 : progress));
                            const height = Math.round((clamped / 100) * 24);
                            const color = p.status === "done" ? "bg-green-600" : "bg-primary/60";
                            return (
                              <div
                                key={idx}
                                className={`w-1 rounded ${color}`}
                                style={{ height }}
                              />
                            );
                          })}
                        </div>
                      )}
                      {canEdit && (
                        <Button size="sm" onClick={handleAddPlan}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Plan
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {treatmentPlans.length === 0 && (
                    <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">No treatment plans configured</p>
                        <p className="text-xs">Add at least one plan to drive remediation and tracking.</p>
                      </div>
                    </div>
                  )}
                  {treatmentPlans.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No treatment plans yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Responsible</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Blocked</TableHead>
                          {canEdit && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {treatmentPlans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.action_title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{plan.action_type}</Badge>
                            </TableCell>
                            <TableCell>{plan.profiles?.full_name || "Unassigned"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  plan.status === "done"
                                    ? "secondary"
                                    : plan.status === "in_progress"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {plan.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {plan.due_date ? (
                                <div className="flex items-center gap-2">
                                  <span>{new Date(plan.due_date).toLocaleDateString()}</span>
                                  {plan.status !== "done" && new Date(plan.due_date) < new Date() && (
                                    <Badge variant="destructive">Overdue</Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="w-48">
                              {canEdit ? (
                                <div className="flex items-center gap-2">
                                  <Slider
                                    value={[typeof plan.progress === "number" ? plan.progress : 0]}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onValueChange={(val) => handleProgressChange(plan.id, val[0])}
                                  />
                                  <span className="text-sm w-10 text-right">{Math.round(plan.progress ?? 0)}%</span>
                                </div>
                              ) : (
                                <span className="text-sm">{Math.round(plan.progress ?? 0)}%</span>
                              )}
                            </TableCell>
                            <TableCell className="w-56">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={!!plan.blocked}
                                    disabled={!canEdit}
                                    onCheckedChange={(checked) => handleBlockedChange(plan.id, checked)}
                                  />
                                  <span className="text-sm">{plan.blocked ? "Blocked" : "Clear"}</span>
                                </div>
                                {plan.blocked && (
                                  <Input
                                    placeholder="Reason"
                                    defaultValue={plan.blocked_reason || ""}
                                    disabled={!canEdit}
                                    onBlur={(e) => handleBlockedReasonChange(plan.id, e.target.value)}
                                  />
                                )}
                              </div>
                            </TableCell>
                            {canEdit && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditPlan(plan)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setPlanToDelete(plan.id);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Linkages</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="controls">
                    <TabsList>
                      <TabsTrigger value="controls">Controls ({controlsCount})</TabsTrigger>
                      <TabsTrigger value="policies">Policies ({policiesCount})</TabsTrigger>
                      <TabsTrigger value="tasks">Tasks ({tasksCount})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="controls" className="space-y-4">
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <select
                            className="border rounded-md h-9 px-2 bg-background"
                            value={newControlId}
                            onChange={(e) => setNewControlId(e.target.value)}
                          >
                            <option value="">Select a control</option>
                            {controlsList
                              .filter((c) => !linkedControls.some((lc) => lc.control_id === c.id))
                              .map((c) => (
                                <option key={c.id} value={c.id}>{c.code} — {c.description}</option>
                              ))}
                          </select>
                          <Button size="sm" onClick={handleLinkControl} disabled={!newControlId}>Link</Button>
                        </div>
                      )}
                      {linkedControls.length === 0 ? (
                        <p className="text-muted-foreground">No linked controls</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Evidence</TableHead>
                              {canEdit && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {linkedControls.map((lc) => (
                              <TableRow key={`${lc.risk_id}-${lc.control_id}`}>
                                <TableCell className="font-medium">{lc.controls?.code}</TableCell>
                                <TableCell>{lc.controls?.description}</TableCell>
                                <TableCell><Badge variant="outline">{lc.controls?.status}</Badge></TableCell>
                                <TableCell>
                                  {!lc.controls?.evidence_url ? (
                                    <div className="inline-flex items-center gap-2 text-amber-600">
                                      <span className="inline-flex items-center gap-1">
                                        <FileWarning className="h-4 w-4" />
                                        <span className="text-xs">Missing</span>
                                      </span>
                                      {canEdit && (
                                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleUploadEvidenceInline(lc.control_id)}>Upload</Button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Provided</span>
                                  )}
                                </TableCell>
                                {canEdit && (
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleUnlinkControl(lc.control_id)}>Unlink</Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                    <TabsContent value="policies" className="space-y-4">
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <select
                            className="border rounded-md h-9 px-2 bg-background"
                            value={newPolicyId}
                            onChange={(e) => setNewPolicyId(e.target.value)}
                          >
                            <option value="">Select a policy</option>
                            {policiesList
                              .filter((p) => !linkedPolicies.some((lp) => lp.policy_id === p.id))
                              .map((p) => (
                                <option key={p.id} value={p.id}>{p.name} {p.version ? `v${p.version}` : ""}</option>
                              ))}
                          </select>
                          <Button size="sm" onClick={handleLinkPolicy} disabled={!newPolicyId}>Link</Button>
                        </div>
                      )}
                      {linkedPolicies.length === 0 ? (
                        <p className="text-muted-foreground">No linked policies</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Version</TableHead>
                              <TableHead>Status</TableHead>
                              {canEdit && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {linkedPolicies.map((lp) => (
                              <TableRow key={`${lp.risk_id}-${lp.policy_id}`}>
                                <TableCell className="font-medium">{lp.policies?.name}</TableCell>
                                <TableCell>{lp.policies?.version || "—"}</TableCell>
                                <TableCell><Badge variant="outline">{lp.policies?.status}</Badge></TableCell>
                                {canEdit && (
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleUnlinkPolicy(lp.policy_id)}>Unlink</Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                    <TabsContent value="tasks" className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-44">
                          <Select value={tasksFilter} onValueChange={setTasksFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch id="my-tasks-only" checked={myTasksOnly} onCheckedChange={setMyTasksOnly} />
                          <Label htmlFor="my-tasks-only" className="text-sm">My Tasks</Label>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="grid grid-cols-2 gap-3 border rounded-md p-3">
                          <div className="col-span-2">
                            <Label htmlFor="task-title" className="text-sm font-medium">Title</Label>
                            <Input id="task-title" className="mt-1" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                          </div>
                          <div>
                            <Label htmlFor="task-assignee" className="text-sm font-medium">Assign to</Label>
                            <select id="task-assignee" className="mt-1 w-full border rounded-md h-9 px-2 bg-background" value={newTask.assigned_to} onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}>
                              <option value="">Unassigned</option>
                              {approvers.map((p) => (
                                <option key={p.id} value={p.id}>{p.full_name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="task-due" className="text-sm font-medium">Due date</Label>
                            <Input id="task-due" type="date" className="mt-1" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
                          </div>
                          <div>
                            <Label htmlFor="task-link-target" className="text-sm font-medium">Link to</Label>
                            <select id="task-link-target" className="mt-1 w-full border rounded-md h-9 px-2 bg-background" value={taskLinkTarget} onChange={(e) => setTaskLinkTarget(e.target.value)}>
                              <option value="risk">Risk</option>
                              <option value="treatment_plan">Treatment Plan</option>
                            </select>
                          </div>
                          {taskLinkTarget === "treatment_plan" && (
                            <div>
                              <Label htmlFor="task-plan" className="text-sm font-medium">Plan</Label>
                              <select id="task-plan" className="mt-1 w-full border rounded-md h-9 px-2 bg-background" value={taskPlanId} onChange={(e) => setTaskPlanId(e.target.value)}>
                                <option value="">Select a plan</option>
                                {treatmentPlans.map((p) => (
                                  <option key={p.id} value={p.id}>{p.action_title}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="col-span-2">
                            <Button size="sm" onClick={handleAddTask}>Add Task</Button>
                          </div>
                        </div>
                      )}
                      {relatedTasks.length === 0 ? (
                        <p className="text-muted-foreground">No linked tasks</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table className="min-w-full">
                            <colgroup>
                              <col style={{ width: "220px" }} />
                              <col style={{ width: "240px" }} />
                              <col style={{ width: "160px" }} />
                              <col style={{ width: "160px" }} />
                            </colgroup>
                            <TableHeader>
                              <TableRow className="bg-slate-50/60">
                                <TableHead className="text-left">Title</TableHead>
                                <TableHead className="text-left">Assigned To</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Due</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(tasksFilter === "all" ? relatedTasks : relatedTasks.filter((t) => t.status === tasksFilter))
                                .filter((t) => !myTasksOnly || (currentUserId && t.assigned_to === currentUserId))
                                .map((t) => (
                                <TableRow key={t.id} className="hover:bg-slate-50">
                                  <TableCell className="font-medium truncate" title={t.title}>{t.title}</TableCell>
                                  <TableCell className="whitespace-nowrap">{t.profiles?.full_name || "Unassigned"}</TableCell>
                                  <TableCell className="text-center"><Badge variant="outline">{t.status}</Badge></TableCell>
                                  <TableCell className="text-center whitespace-nowrap">{t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Findings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="w-44">
                    <Select value={findingsFilter} onValueChange={setFindingsFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {canEdit && (
                    <div className="grid grid-cols-2 gap-3 border rounded-md p-3">
                      <div className="col-span-2">
                        <Label htmlFor="finding-title" className="text-sm font-medium">Title</Label>
                        <Input id="finding-title" className="mt-1" value={newFinding.title} onChange={(e) => setNewFinding({ ...newFinding, title: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="finding-owner" className="text-sm font-medium">Owner</Label>
                        <select id="finding-owner" className="mt-1 w-full border rounded-md h-9 px-2 bg-background" value={newFinding.owner} onChange={(e) => setNewFinding({ ...newFinding, owner: e.target.value })}>
                          <option value="">Select owner</option>
                          {approvers.map((p) => (
                            <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="finding-severity" className="text-sm font-medium">Severity</Label>
                        <select id="finding-severity" className="mt-1 w-full border rounded-md h-9 px-2 bg-background" value={newFinding.severity} onChange={(e) => setNewFinding({ ...newFinding, severity: e.target.value })}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="finding-status" className="text-sm font-medium">Status</Label>
                        <select id="finding-status" className="mt-1 w-full border rounded-md h-9 px-2 bg-background" value={newFinding.status} onChange={(e) => setNewFinding({ ...newFinding, status: e.target.value })}>
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="finding-desc" className="text-sm font-medium">Description</Label>
                        <Textarea id="finding-desc" className="mt-1" rows={3} value={newFinding.description} onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="finding-sla" className="text-sm font-medium">SLA due date</Label>
                        <Input id="finding-sla" type="date" className="mt-1" value={newFinding.sla_due_date} onChange={(e) => setNewFinding({ ...newFinding, sla_due_date: e.target.value })} />
                      </div>
                      <div className="col-span-2">
                        <Button size="sm" onClick={handleAddFinding}>Add Finding</Button>
                      </div>
                    </div>
                  )}
                  {findings.length === 0 ? (
                    <p className="text-muted-foreground">No findings recorded yet—log audit or incident outcomes here.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>SLA Due</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reported</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(findingsFilter === "all" ? findings : findings.filter((f) => f.status === findingsFilter)).map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium">{f.title}</TableCell>
                            <TableCell>
                              {(() => {
                                const sev = (f.severity || "").toLowerCase();
                                const sevClass = sev === "low"
                                  ? "bg-green-100 text-green-700"
                                  : sev === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : sev === "high"
                                  ? "bg-orange-100 text-orange-800"
                                  : sev === "critical"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-muted text-foreground";
                                return <Badge className={sevClass}>{f.severity}</Badge>;
                              })()}
                            </TableCell>
                            <TableCell>{f.profiles?.full_name || (approvers.find((p) => p.id === f.owner)?.full_name) || "—"}</TableCell>
                            <TableCell>{f.sla_due_date ? new Date(f.sla_due_date).toLocaleDateString() : "—"}</TableCell>
                            <TableCell><Badge variant="outline">{f.status}</Badge></TableCell>
                            <TableCell>{new Date(f.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Acceptance</CardTitle>
                    {canEdit && (
                      <Button
                        size="sm"
                        disabled={displayStatus === "requested" || displayStatus === "under_review"}
                        onClick={() => setAcceptFormOpen((v) => !v)}
                      >
                        {displayStatus === "requested" ? "Awaiting Approval" : displayStatus === "under_review" ? "Under Review" : displayStatus === "approved" ? "Request Renewal" : displayStatus === "rejected" ? "Resubmit Request" : "Request Acceptance"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{displayStatusLabel}</Badge>
                        {isExpired && <Badge variant="destructive">Expired</Badge>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Approver</p>
                      <p className="mt-1">{approverProfile ? `${approverProfile.full_name} (${approverProfile.role})` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Expiry</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span>{risk.acceptance_expiry ? new Date(risk.acceptance_expiry).toLocaleDateString() : "—"}</span>
                        {(() => {
                          if (!risk.acceptance_expiry) return null;
                          const today = new Date();
                          const expiry = new Date(risk.acceptance_expiry);
                          today.setHours(0,0,0,0);
                          expiry.setHours(0,0,0,0);
                          const msPerDay = 24 * 60 * 60 * 1000;
                          const daysLeft = Math.max(0, Math.round((expiry.getTime() - today.getTime()) / msPerDay));
                          return (
                            <span className={`text-xs ${daysLeft <= 1 ? "text-red-600" : daysLeft <= 7 ? "text-red-500" : daysLeft <= 14 ? "text-amber-600" : "text-muted-foreground"}`}>{daysLeft} days left</span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  {displayStatus === "under_review" && canDecideAcceptance && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">Decision comment (optional)</label>
                        <Textarea
                          className="mt-1"
                          value={decisionComment}
                          onChange={(e) => setDecisionComment(e.target.value)}
                          placeholder="Add context for your approval or rejection"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={deciding} onClick={handleApproveAcceptance}>Approve</Button>
                        <Button size="sm" disabled={deciding} variant="destructive" onClick={handleRejectAcceptance}>Reject</Button>
                      </div>
                    </div>
                  )}
                  {acceptFormOpen && canEdit && (
                    <div className="space-y-3 border rounded-md p-3">
                      <p className="text-sm font-medium text-muted-foreground">Acceptance Criteria</p>
                      <div>
                        <label className="text-sm font-medium">Approver</label>
                        <select
                          className="mt-1 w-full border rounded-md h-9 px-2 bg-background"
                          value={acceptForm.approver}
                          onChange={(e) => setAcceptForm({ ...acceptForm, approver: e.target.value })}
                        >
                          <option value="">Select approver</option>
                          {approvers.map((p) => (
                            <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                          ))}
                        </select>
                        {approvers.length === 0 && (
                          <p className="mt-1 text-sm text-muted-foreground">No eligible approvers found. Approvers must be admins or managers other than you. Go to <a href="/users" className="underline">Users</a> to invite or change roles.</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium">Rationale</label>
                        <Textarea
                          className="mt-1"
                          value={acceptForm.rationale}
                          onChange={(e) => setAcceptForm({ ...acceptForm, rationale: e.target.value })}
                          placeholder="Justification for accepting this risk"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Expiry date</label>
                        <Input
                          type="date"
                          className="mt-1"
                          value={acceptForm.expiry}
                          onChange={(e) => setAcceptForm({ ...acceptForm, expiry: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleRequestAcceptance} disabled={approvers.length === 0 || !acceptForm.approver || !acceptForm.rationale || !acceptForm.expiry}>Submit request</Button>
                        <Button size="sm" variant="outline" onClick={() => setAcceptFormOpen(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Audit Trail</p>
                    {acceptanceLogs.length === 0 ? (
                      <p className="text-muted-foreground mt-1">No acceptance activity</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="mt-2 min-w-full">
                          <colgroup>
                            <col style={{ width: "180px" }} />
                            <col style={{ width: "160px" }} />
                            <col style={{ width: "220px" }} />
                            <col style={{ width: "300px" }} />
                            <col style={{ width: "160px" }} />
                          </colgroup>
                          <TableHeader>
                            <TableRow className="bg-slate-50/60">
                              <TableHead className="text-left">Date</TableHead>
                              <TableHead className="text-left">Action</TableHead>
                              <TableHead className="text-left">Actor</TableHead>
                              <TableHead className="text-left">Rationale</TableHead>
                              <TableHead className="text-center">Expiry</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {acceptanceLogs.map((log) => (
                              <TableRow key={log.id} className="hover:bg-slate-50">
                                <TableCell className="whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                                <TableCell className="whitespace-nowrap">{log.action}</TableCell>
                                <TableCell className="whitespace-nowrap">{log.profiles?.full_name || "—"}</TableCell>
                                <TableCell className="truncate" title={log.rationale || "—"}>{log.rationale || "—"}</TableCell>
                                <TableCell className="text-center whitespace-nowrap">{log.expiry ? new Date(log.expiry).toLocaleDateString() : "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reviews</p>
                    {reviewLogs.length === 0 ? (
                      <p className="text-muted-foreground">No reviews yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="mt-2 min-w-full">
                          <colgroup>
                            <col style={{ width: "200px" }} />
                            <col style={{ width: "240px" }} />
                            <col />
                          </colgroup>
                          <TableHeader>
                            <TableRow className="bg-slate-50/60">
                              <TableHead className="text-left">Date</TableHead>
                              <TableHead className="text-left">Reviewer</TableHead>
                              <TableHead className="text-left">Note</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reviewLogs.map((log: any) => (
                              <TableRow key={log.id} className="hover:bg-slate-50">
                                <TableCell className="whitespace-nowrap">{new Date(log.reviewed_at).toLocaleString()}</TableCell>
                                <TableCell className="whitespace-nowrap">{log.profiles?.full_name || "—"}</TableCell>
                                <TableCell className="truncate" title={log.note || "—"}>{log.note || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Audit Changes</p>
                    {auditLogs.length === 0 ? (
                      <p className="text-muted-foreground">No audit changes recorded</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="mt-2 min-w-full">
                          <colgroup>
                            <col style={{ width: "180px" }} />
                            <col style={{ width: "220px" }} />
                            <col />
                          </colgroup>
                          <TableHeader>
                            <TableRow className="bg-slate-50/60">
                              <TableHead className="text-left">Date</TableHead>
                              <TableHead className="text-left">Actor</TableHead>
                              <TableHead className="text-left">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {auditLogs.map((l: any) => (
                              <TableRow key={l.id} className="hover:bg-slate-50">
                                <TableCell className="whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                                <TableCell className="whitespace-nowrap">{l.actor_email || "—"}</TableCell>
                                <TableCell className="truncate" title={l.action}>{l.action}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
        </SheetContent>
      </Sheet>

      <RiskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          onUpdate();
          fetchTreatmentPlans();
          fetchDelegateProfile();
          fetchLinkages();
          fetchFindings();
          fetchRelatedTasks();
        }}
        risk={risk}
      />

      <TreatmentPlanDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        riskId={risk.id}
        plan={selectedPlan}
        onSuccess={() => {
          fetchTreatmentPlans();
          onUpdate();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this treatment plan. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reviewConfirmOpen} onOpenChange={setReviewConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this risk as reviewed?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const currentNext = risk.next_review_date ? new Date(risk.next_review_date) : null;
                const base = currentNext && !Number.isNaN(currentNext.getTime()) ? currentNext : new Date();
                const projected = new Date(base);
                projected.setDate(base.getDate() + CADENCE_DAYS);
                return (
                  <div className="space-y-2">
                    <div>
                      <p>Next Review will move to T+{CADENCE_DAYS} days.</p>
                      <p className="text-sm text-muted-foreground">Base date: {base.toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">New date: {projected.toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">A review timeline entry will be recorded.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="review_note">Note (optional)</Label>
                      <Textarea
                        id="review_note"
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Context or observations for this review"
                        rows={3}
                      />
                    </div>
                  </div>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setReviewConfirmOpen(false); handleMarkReviewed(); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
