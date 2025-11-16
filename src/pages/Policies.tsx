import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { recordAudit } from "@/integrations/supabase/audit";
import { uploadPolicyFile, signPolicyFile } from "@/integrations/supabase/storage";
import { validatePolicyUpload } from "@/integrations/supabase/uploadValidation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Upload, Eye, RefreshCcw, Search, Link as LinkIcon, UserCheck, Megaphone, FileDown, History, Paperclip } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgUsage } from "@/hooks/useOrgUsage";
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

const Policies = () => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<string | null>(null);
  const { role } = useUserRole();
  const { limits, counts } = useOrgUsage();
  const [owners, setOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [reviewDueFilter, setReviewDueFilter] = useState<string>("all");
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [filesForPolicy, setFilesForPolicy] = useState<any[]>([]);
  const [filesPolicy, setFilesPolicy] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [attachmentsByPolicy, setAttachmentsByPolicy] = useState<Record<string, any[]>>({});
  const [exceptionCountByPolicy, setExceptionCountByPolicy] = useState<Record<string, number>>({});
  const [usageByPolicy, setUsageByPolicy] = useState<Record<string, { controls: number; risks: number }>>({});
  const [attestationByPolicy, setAttestationByPolicy] = useState<Record<string, { percent: number; campaign?: any }>>({});

  // Approvals modal state
  const [approvalsDialogOpen, setApprovalsDialogOpen] = useState(false);
  const [approvalsPolicy, setApprovalsPolicy] = useState<any | null>(null);
  const [existingApprovals, setExistingApprovals] = useState<any[]>([]);
  const [approverId, setApproverId] = useState<string>("");
  const [approvalComment, setApprovalComment] = useState<string>("");

  // Attestation roster state
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
  const [rosterCampaign, setRosterCampaign] = useState<any | null>(null);
  const [rosterEntries, setRosterEntries] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [attestNotes, setAttestNotes] = useState<Record<string, string>>({});

  // Exceptions modal state
  const [exceptionsDialogOpen, setExceptionsDialogOpen] = useState(false);
  const [exceptionsForPolicy, setExceptionsForPolicy] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    owner: "",
    author: "",
    version: "",
    status: "draft",
    review_date: "",
    effective_date: "",
    attestation_percent: "",
    exceptions_count: "",
    tags: "",
    classification: "",
    supersedes_id: "",
    retention_period_months: "",
    change_summary: "",
    change_type: "minor",
  });

  useEffect(() => {
    fetchOwners();
    fetchPolicies();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // role provided by useUserRole

  const fetchOwners = async () => {
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("org_id", orgId);
    if (data) {
      setOwners(data);
    }
  };

  const fetchPolicies = async () => {
    const orgId = await getRequiredOrgId();
    const { data, error } = await supabase
      .from("policies")
      .select("*, profiles!policies_owner_fkey(full_name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch policies",
      });
    } else if (data) {
      setPolicies(data);
      const policyIds = (data || []).map((p: any) => p.id);
      const { data: files, error: filesErr } = await supabase
        .from("policy_files")
        .select("id, policy_id, file_name, file_type, file_url, storage_path, uploaded_at, updated_at, status")
        .eq("org_id", orgId)
        .in("policy_id", policyIds.length ? policyIds : ["00000000-0000-0000-0000-000000000000"]) // safe no-op when empty
        .order("updated_at", { ascending: false });
      if (!filesErr && files) {
        const grouped: Record<string, any[]> = {};
        for (const f of files) {
          if (!grouped[f.policy_id]) grouped[f.policy_id] = [];
          grouped[f.policy_id].push(f);
        }
        setAttachmentsByPolicy(grouped);
      }

      // Fetch aggregates (exceptions, usage, attestation %)
      await fetchAggregates(policyIds);
    }
  };

  const fetchAggregates = async (policyIds: string[]) => {
    // Exceptions count per policy (open only)
    const orgId = await getRequiredOrgId();
    const { data: ex } = await supabase
      .from("policy_exceptions")
      .select("policy_id, status")
      .eq("org_id", orgId)
      .in("policy_id", policyIds.length ? policyIds : ["00000000-0000-0000-0000-000000000000"]);
    const exCounts: Record<string, number> = {};
    (ex || []).forEach((row: any) => {
      if (row.status === "open") {
        exCounts[row.policy_id] = (exCounts[row.policy_id] || 0) + 1;
      }
    });
    setExceptionCountByPolicy(exCounts);

    // Usage counts (controls and risks mapping)
    const { data: pc } = await supabase
      .from("policy_controls")
      .select("policy_id")
      .eq("org_id", orgId)
      .in("policy_id", policyIds.length ? policyIds : ["00000000-0000-0000-0000-000000000000"]);
    const { data: rp } = await supabase
      .from("risk_policies")
      .select("policy_id")
      .eq("org_id", orgId)
      .in("policy_id", policyIds.length ? policyIds : ["00000000-0000-0000-0000-000000000000"]);
    const usage: Record<string, { controls: number; risks: number }> = {};
    (pc || []).forEach((row: any) => {
      const id = row.policy_id;
      usage[id] = usage[id] || { controls: 0, risks: 0 };
      usage[id].controls++;
    });
    (rp || []).forEach((row: any) => {
      const id = row.policy_id;
      usage[id] = usage[id] || { controls: 0, risks: 0 };
      usage[id].risks++;
    });
    setUsageByPolicy(usage);

    // Attestation percent from latest campaign
    const { data: campaigns } = await supabase
      .from("attestation_campaigns")
      .select("id, policy_id, status, due_date, created_at")
      .eq("org_id", orgId)
      .in("policy_id", policyIds.length ? policyIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false });
    const latestByPolicy: Record<string, any> = {};
    (campaigns || []).forEach((c: any) => {
      if (!latestByPolicy[c.policy_id]) latestByPolicy[c.policy_id] = c;
    });
    const campaignIds = Object.values(latestByPolicy).map((c: any) => c.id);
    const attestationMap: Record<string, { percent: number; campaign?: any }> = {};
    if (campaignIds.length > 0) {
      const { data: atts } = await supabase
        .from("attestations")
        .select("campaign_id, status")
        .eq("org_id", orgId)
        .in("campaign_id", campaignIds);
      const byCampaign: Record<string, { total: number; done: number }> = {};
      (atts || []).forEach((a: any) => {
        const cId = a.campaign_id;
        byCampaign[cId] = byCampaign[cId] || { total: 0, done: 0 };
        byCampaign[cId].total++;
        if (a.status === "acknowledged" || a.status === "completed") byCampaign[cId].done++;
      });
      Object.values(latestByPolicy).forEach((c: any) => {
        const agg = byCampaign[c.id];
        const percent = agg ? Math.round((agg.done / Math.max(agg.total, 1)) * 100) : 0;
        attestationMap[c.policy_id] = { percent, campaign: c };
      });
    }
    setAttestationByPolicy(attestationMap);
  };

  const handleAdd = () => {
    setSelectedPolicy(null);
    setFormData({
      name: "",
      owner: "",
      author: "",
      version: "",
      status: "draft",
      review_date: "",
      effective_date: "",
      attestation_percent: "",
      exceptions_count: "",
      tags: "",
      classification: "internal",
      supersedes_id: "",
      retention_period_months: "",
      change_summary: "",
      change_type: "minor",
    });
    setDialogOpen(true);
  };

  const handleEdit = (policy: any) => {
    setSelectedPolicy(policy);
    setFormData({
      name: policy.name || "",
      owner: policy.owner || "",
      author: policy.author || "",
      version: policy.version || "",
      status: policy.status || "draft",
      review_date: policy.review_date || "",
      effective_date: policy.effective_date || "",
      attestation_percent: policy.attestation_percent ?? "",
      exceptions_count: policy.exceptions_count ?? "",
      tags: Array.isArray(policy.tags) ? policy.tags.join(", ") : "",
      classification: policy.classification || "internal",
      supersedes_id: policy.supersedes_id || "",
      retention_period_months: policy.retention_period_months ?? "",
      change_summary: "",
      change_type: "minor",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const orgId = await getRequiredOrgId();

    const payload: any = {
      name: formData.name,
      owner: formData.owner || null,
      author: formData.author || null,
      version: formData.version,
      status: formData.status,
      review_date: formData.review_date || null,
      effective_date: formData.effective_date || null,
      attestation_percent: formData.attestation_percent !== "" ? Number(formData.attestation_percent) : null,
      exceptions_count: formData.exceptions_count !== "" ? Number(formData.exceptions_count) : null,
      tags: formData.tags
        ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : null,
      classification: formData.classification || null,
      supersedes_id: formData.supersedes_id || null,
      retention_period_months: formData.retention_period_months !== "" ? Number(formData.retention_period_months) : null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (selectedPolicy) {
      // Handle version bump
      let newVersion = formData.version;
      if (formData.change_summary && formData.change_type) {
        const parts = String(formData.version || "1.0").split(".").map((n) => parseInt(n, 10));
        let major = parts[0] || 1;
        let minor = parts[1] || 0;
        if (formData.change_type === "minor") {
          minor += 1;
        } else {
          major += 1;
          minor = 0;
        }
        newVersion = `${major}.${minor}`;
        payload.version = newVersion;
        const { data: createdVersion, error: pvErr } = await supabase
          .from("policy_versions")
          .insert({
            policy_id: selectedPolicy.id,
            version: newVersion,
            change_summary: formData.change_summary,
            org_id: orgId,
          })
          .select()
          .single();
        if (!pvErr) {
          await recordAudit({
            entity_type: "policy_versions",
            entity_id: createdVersion?.id ?? `${selectedPolicy.id}:${newVersion}`,
            action: "insert",
            before_data: { policy_id: selectedPolicy.id, version: formData.version },
            after_data: createdVersion ?? { policy_id: selectedPolicy.id, version: newVersion },
          });
        }
      }
      const { data: updatedPolicy, error: updErr } = await supabase
        .from("policies")
        .update(payload)
        .eq("id", selectedPolicy.id)
        .eq("org_id", orgId)
        .select()
        .single();
      error = updErr || null;
      if (!updErr) {
        await recordAudit({
          entity_type: "policies",
          entity_id: selectedPolicy.id,
          action: "update",
          before_data: selectedPolicy,
          after_data: updatedPolicy,
        });
      }
    } else {
      const { data: created, error: insErr } = await supabase
        .from("policies")
        .insert({ ...payload, org_id: orgId })
        .select()
        .single();
      error = insErr || null;
      if (!insErr) {
        await recordAudit({
          entity_type: "policies",
          entity_id: created?.id,
          action: "insert",
          after_data: created,
        });
      }
    }

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: selectedPolicy ? "Policy updated" : "Policy created",
      });
      fetchPolicies();
      setDialogOpen(false);
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!policyToDelete) return;

    const orgId = await getRequiredOrgId();
    const before = policies.find((p) => p.id === policyToDelete) || null;
    const { error } = await supabase
      .from("policies")
      .delete()
      .eq("id", policyToDelete)
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
        description: "Policy deleted",
      });
      await recordAudit({
        entity_type: "policies",
        entity_id: policyToDelete,
        action: "delete",
        before_data: before,
      });
      fetchPolicies();
    }

    setDeleteDialogOpen(false);
    setPolicyToDelete(null);
  };

  const canEdit = role === "admin" || role === "manager";

  const derivedStatus = (policy: any) => {
    if (policy.status === "archived") return "retired";
    const filesCount = (attachmentsByPolicy[policy.id]?.length ?? 0);
    if (policy.status === "draft" && filesCount > 0) return "in_review";
    if (policy.status === "active" && (policy.attestation_percent ?? 0) >= 90) return "approved";
    return policy.status || "draft";
  };

  const statusBadgeVariant = (st: string) => {
    switch (st) {
      case "approved":
        return "default";
      case "active":
        return "default";
      case "in_review":
        return "secondary";
      case "retired":
        return "outline";
      case "draft":
      default:
        return "outline";
    }
  };

  const filteredPolicies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const addDays = (d: number) => {
      const t = new Date(now);
      t.setDate(t.getDate() + d);
      return t;
    };
    return policies.filter((p) => {
      const ownerName = p.profiles?.full_name || "";
      const tagsArr = Array.isArray(p.tags) ? p.tags : [];
      const matchesSearch = q
        ? (
            (p.name?.toLowerCase().includes(q) ?? false) ||
            (ownerName.toLowerCase().includes(q) ?? false) ||
            (p.version?.toLowerCase().includes(q) ?? false) ||
            (tagsArr.join(", ").toLowerCase().includes(q) ?? false)
          )
        : true;

      const matchesStatus = statusFilter === "all"
        ? true
        : derivedStatus(p) === statusFilter;

      const matchesOwner = ownerFilter === "all" ? true : p.owner === ownerFilter;

      const rd = p.review_date ? new Date(p.review_date) : null;
      let matchesReview = true;
      if (reviewDueFilter !== "all") {
        if (!rd) {
          matchesReview = false;
        } else if (reviewDueFilter === "overdue") {
          matchesReview = rd < now;
        } else if (reviewDueFilter === "30") {
          matchesReview = rd >= now && rd <= addDays(30);
        } else if (reviewDueFilter === "60") {
          matchesReview = rd >= now && rd <= addDays(60);
        } else if (reviewDueFilter === "90") {
          matchesReview = rd >= now && rd <= addDays(90);
        }
      }

      return matchesSearch && matchesStatus && matchesOwner && matchesReview;
    });
  }, [policies, searchQuery, statusFilter, ownerFilter, reviewDueFilter, attachmentsByPolicy]);

  const openFilesDialog = (policy: any) => {
    setFilesPolicy(policy);
    setFilesForPolicy(attachmentsByPolicy[policy.id] || []);
    setFilesDialogOpen(true);
  };

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [versionsForPolicy, setVersionsForPolicy] = useState<any[]>([]);
  const [historyPolicy, setHistoryPolicy] = useState<any | null>(null);
  const openHistory = async (policy: any) => {
    setHistoryPolicy(policy);
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("policy_versions")
      .select("id, version, change_summary, created_at")
      .eq("policy_id", policy.id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setVersionsForPolicy(data || []);
    setHistoryDialogOpen(true);
  };

  const [linksDialogOpen, setLinksDialogOpen] = useState(false);
  const [linkedControls, setLinkedControls] = useState<any[]>([]);
  const [linkedRisks, setLinkedRisks] = useState<any[]>([]);
  const [linksPolicy, setLinksPolicy] = useState<any | null>(null);
  const openLinks = async (policy: any) => {
    setLinksPolicy(policy);
    const orgId = await getRequiredOrgId();
    const { data: ctrls } = await supabase
      .from("policy_controls")
      .select("control_id, controls(name, owner, status)")
      .eq("policy_id", policy.id)
      .eq("org_id", orgId);
    const { data: risks } = await supabase
      .from("risk_policies")
      .select("risk_id, risks(name, status, owner)")
      .eq("policy_id", policy.id)
      .eq("org_id", orgId);
    setLinkedControls(ctrls || []);
    setLinkedRisks(risks || []);
    setLinksDialogOpen(true);
  };

  const triggerUpload = (policyId: string) => {
    if (!canEdit) return;
    if (limits && counts && counts.storage_items >= limits.max_storage_items) {
      toast({ variant: "destructive", title: "Upload disabled", description: "Storage limit reached for your plan. Visit Settings to upgrade." });
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      // Client-side validation
      const validation = await validatePolicyUpload(file);
      if (!validation.ok) {
        await recordAudit({
          entity_type: "policy_files",
          entity_id: policyId,
          action: "upload_blocked",
          before_data: { policy_id: policyId },
          after_data: { policy_id: policyId, reason: validation.reason, meta: validation },
        });
        toast({ variant: "destructive", title: "Upload blocked", description: validation.reason || "Invalid file" });
        return;
      }
      setUploading(true);
      try {
        const orgId = await getRequiredOrgId();
        const result = await uploadPolicyFile(policyId, file);
        // Set hygiene metadata
        if (result?.storage_path && validation.sha256) {
          try {
            await supabase
              .from("policy_files")
              .update({ scan_status: "not_scanned", hash_sha256: validation.sha256 })
              .eq("storage_path", result.storage_path)
              .eq("org_id", orgId);
          } catch (e) {
            console.warn("policy_files hygiene update failed", e);
          }
        }
        await recordAudit({
          entity_type: "policy_files",
          entity_id: policyId,
          action: "upload_success",
          after_data: { policy_id: policyId, file_name: file.name, mime: file.type, size: file.size, storage_path: result?.storage_path, hash_sha256: validation.sha256 },
        });
        await supabase
          .from("policies")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", policyId)
          .eq("org_id", orgId);
        toast({ title: "Uploaded", description: "File added to policy" });
        fetchPolicies();
      } catch (err: any) {
        toast({ variant: "destructive", title: "Upload failed", description: err?.message || "Failed" });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const replaceLatestFile = async (policyId: string) => {
    const latest = (attachmentsByPolicy[policyId] || [])[0];
    if (!latest) {
      triggerUpload(policyId);
      return;
    }
    if (limits && counts && counts.storage_items >= limits.max_storage_items) {
      toast({ variant: "destructive", title: "Replace disabled", description: "Storage limit reached for your plan. Visit Settings to upgrade." });
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const validation = await validatePolicyUpload(file);
      if (!validation.ok) {
        await recordAudit({ entity_type: "policy_files", entity_id: policyId, action: "replace_blocked", before_data: latest, after_data: { policy_id: policyId, reason: validation.reason, meta: validation } });
        toast({ variant: "destructive", title: "Replace blocked", description: validation.reason || "Invalid file" });
        return;
      }
      setUploading(true);
      const orgId = await getRequiredOrgId();
      await supabase
        .from("policy_files")
        .update({ status: "replaced" })
        .eq("id", latest.id)
        .eq("org_id", orgId);
      try {
        const result = await uploadPolicyFile(policyId, file);
        if (result?.storage_path && validation.sha256) {
          try {
            await supabase
              .from("policy_files")
              .update({ scan_status: "not_scanned", hash_sha256: validation.sha256 })
              .eq("storage_path", result.storage_path)
              .eq("org_id", orgId);
          } catch (e) {
            console.warn("policy_files hygiene update failed", e);
          }
        }
        await recordAudit({ entity_type: "policy_files", entity_id: policyId, action: "replace_success", before_data: latest, after_data: { policy_id: policyId, file_name: file.name, mime: file.type, size: file.size, storage_path: result?.storage_path, hash_sha256: validation.sha256 } });
        await supabase
          .from("policies")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", policyId)
          .eq("org_id", orgId);
        toast({ title: "Replaced", description: "Latest file replaced" });
        fetchPolicies();
      } catch (err: any) {
        toast({ variant: "destructive", title: "Replace failed", description: err?.message || "Failed" });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  // Approvals actions
  const openApprovals = async (policy: any) => {
    setApprovalsPolicy(policy);
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("policy_approvals")
      .select("id, approver_id, comment, status, approved_at")
      .eq("policy_id", policy.id)
      .eq("org_id", orgId)
      .order("approved_at", { ascending: false });
    setExistingApprovals(data || []);
    setApprovalsDialogOpen(true);
  };

  const recordApproval = async () => {
    if (!approvalsPolicy || !approverId) return;
    const orgId = await getRequiredOrgId();
    const { error } = await supabase.from("policy_approvals").insert({
      policy_id: approvalsPolicy.id,
      approver_id: approverId,
      comment: approvalComment || null,
      status: "approved",
      approved_at: new Date().toISOString(),
      org_id: orgId,
    });
    if (error) {
      toast({ variant: "destructive", title: "Approval failed", description: error.message });
      return;
    }
    // Update policy status to approved, and active if effective date passed
    const nowIso = new Date().toISOString();
    const shouldActivate = approvalsPolicy.effective_date && new Date(approvalsPolicy.effective_date) <= new Date();
    await supabase
      .from("policies")
      .update({ status: shouldActivate ? "active" : "approved", updated_at: nowIso })
      .eq("id", approvalsPolicy.id)
      .eq("org_id", orgId);
    toast({ title: "Approval recorded", description: "Policy marked as approved" });
    setApprovalsDialogOpen(false);
    setApproverId("");
    setApprovalComment("");
    fetchPolicies();
  };

  // Attestation roster
  const openRoster = async (policy: any) => {
    const c = attestationByPolicy[policy.id]?.campaign;
    if (!c) {
      toast({ title: "No campaign", description: "No attestation campaign found for this policy." });
      return;
    }
    setRosterCampaign(c);
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("attestations")
      .select("id, status, acknowledged_at, user_id, comment, profiles!attestations_user_id_fkey(full_name, role)")
      .eq("campaign_id", c.id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setRosterEntries(data || []);
    setRosterDialogOpen(true);
  };

  const openRosterByCampaign = async (campaign: any) => {
    setRosterCampaign(campaign);
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("attestations")
      .select("id, status, acknowledged_at, user_id, comment, profiles!attestations_user_id_fkey(full_name, role)")
      .eq("campaign_id", campaign.id)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setRosterEntries(data || []);
    setRosterDialogOpen(true);
  };

  const acknowledgeAttestation = async (attId: string) => {
    const orgId = await getRequiredOrgId();
    const note = attestNotes[attId] || "";
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("attestations")
      .update({ status: "acknowledged", acknowledged_at: now, comment: note || null })
      .eq("id", attId)
      .eq("org_id", orgId);
    if (error) {
      toast({ variant: "destructive", title: "Attestation failed", description: error.message });
      return;
    }
    const updated = rosterEntries.map((r) => (r.id === attId ? { ...r, status: "acknowledged", acknowledged_at: now, comment: note || null } : r));
    setRosterEntries(updated);
    setAttestNotes((prev) => ({ ...prev, [attId]: "" }));
    toast({ title: "Attested", description: "Acknowledgement recorded" });
  };

  // Campaign creation
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [campaignPolicy, setCampaignPolicy] = useState<any | null>(null);
  const [campaignTarget, setCampaignTarget] = useState<string>("all");
  const [campaignRole, setCampaignRole] = useState<string>("manager");
  const [campaignDueDate, setCampaignDueDate] = useState<string>("");
  const [campaignTrainingUrl, setCampaignTrainingUrl] = useState<string>("");

  const startCampaign = (policy: any) => {
    setCampaignPolicy(policy);
    setCampaignDialogOpen(true);
  };

  const createCampaign = async () => {
    if (!campaignPolicy) return;
    const orgId = await getRequiredOrgId();
    const payload: any = {
      policy_id: campaignPolicy.id,
      target_type: campaignTarget,
      target_role: campaignTarget === "role" ? campaignRole : null,
      due_date: campaignDueDate || null,
      training_url: campaignTrainingUrl || null,
      status: "open",
      org_id: orgId,
    };
    const { data: created, error } = await supabase
      .from("attestation_campaigns")
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast({ variant: "destructive", title: "Failed to create campaign", description: error.message });
      return;
    }
    // Build roster
    let participants: any[] = [];
    if (campaignTarget === "all") {
      const { data } = await supabase.from("profiles").select("id").eq("org_id", orgId);
      participants = data || [];
    } else if (campaignTarget === "role") {
      const { data } = await supabase.from("profiles").select("id, role").eq("role", campaignRole).eq("org_id", orgId);
      participants = data || [];
    }
    if (participants.length > 0) {
      const rows = participants.map((p) => ({
        campaign_id: created.id,
        user_id: p.id,
        status: "pending",
        org_id: orgId,
      }));
      await supabase.from("attestations").insert(rows);
    }
    toast({ title: "Campaign created", description: `Roster size ${participants.length}` });
    setCampaignDialogOpen(false);
    setCampaignPolicy(null);
    setCampaignTrainingUrl("");
    setCampaignDueDate("");
    fetchPolicies();
  };

  // Exceptions list
  const openExceptions = async (policy: any) => {
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("policy_exceptions")
      .select("id, requester_id, approver_id, scope, title, expiry_date, status")
      .eq("policy_id", policy.id)
      .eq("org_id", orgId)
      .eq("status", "open")
      .order("created_at", { ascending: false });
    setExceptionsForPolicy(data || []);
    setExceptionsDialogOpen(true);
  };

  // Export CSV
  const exportCsv = async () => {
    const orgId = await getRequiredOrgId();
    const ids = filteredPolicies.map((p) => p.id);
    let versionsByPolicy: Record<string, string[]> = {};
    if (ids.length > 0) {
      const { data } = await supabase
        .from("policy_versions")
        .select("policy_id, version")
        .in("policy_id", ids)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      versionsByPolicy = {};
      for (const row of (data || [])) {
        const pid = (row as any).policy_id;
        const v = (row as any).version;
        if (!versionsByPolicy[pid]) versionsByPolicy[pid] = [];
        versionsByPolicy[pid].push(v);
      }
    }
    const header = [
      "Name",
      "Classification",
      "Owner",
      "Author",
      "Version",
      "Versions",
      "Status",
      "Effective",
      "Review Date",
      "Attestation %",
      "Exceptions",
      "Controls Used",
      "Risks Used",
      "Tags",
    ];
    const rows = filteredPolicies.map((p) => [
      p.name,
      p.classification || "",
      p.profiles?.full_name || "",
      p.author || "",
      p.version || "",
      (versionsByPolicy[p.id] || []).join(";"),
      derivedStatus(p),
      p.effective_date ? new Date(p.effective_date).toLocaleDateString() : "",
      p.review_date ? new Date(p.review_date).toLocaleDateString() : "",
      (attestationByPolicy[p.id]?.percent ?? 0).toString(),
      (exceptionCountByPolicy[p.id] ?? 0).toString(),
      (usageByPolicy[p.id]?.controls ?? 0).toString(),
      (usageByPolicy[p.id]?.risks ?? 0).toString(),
      Array.isArray(p.tags) ? p.tags.join(";") : (p.tags || ""),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `policy-register-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Policies</h2>
          <p className="text-muted-foreground">Manage organizational policies and documents</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          )}
          <Button variant="outline" onClick={() => exportCsv()}>
            <FileDown className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={async () => {
            const orgId = await getRequiredOrgId();
            const ids = filteredPolicies.map((p) => p.id);
            let versions: Record<string, any[]> = {};
            if (ids.length > 0) {
              const { data } = await supabase
                .from("policy_versions")
                .select("policy_id, version, change_summary, created_at")
                .in("policy_id", ids)
                .eq("org_id", orgId)
                .order("created_at", { ascending: false });
              versions = {};
              for (const row of (data || [])) {
                const pid = (row as any).policy_id;
                if (!versions[pid]) versions[pid] = [];
                versions[pid].push(row);
              }
            }
            const payload = filteredPolicies.map((p) => ({
              id: p.id,
              name: p.name,
              classification: p.classification || null,
              owner_name: p.profiles?.full_name || null,
              author: p.author || null,
              version: p.version || null,
              status: derivedStatus(p),
              effective_date: p.effective_date || null,
              review_date: p.review_date || null,
              attestation_percent: attestationByPolicy[p.id]?.percent ?? 0,
              exceptions_count: exceptionCountByPolicy[p.id] ?? 0,
              controls_used: usageByPolicy[p.id]?.controls ?? 0,
              risks_used: usageByPolicy[p.id]?.risks ?? 0,
              tags: Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : []),
              versions: versions[p.id] || []
            }));
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `policies-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <FileDown className="h-4 w-4 mr-2" /> Export JSON
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attestation Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignList onOpenRoster={openRosterByCampaign} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policy Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search & Filters */}
          <div className="mb-4 grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, owner, version, tags"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="retired">Retired/Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.full_name || o.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={reviewDueFilter} onValueChange={setReviewDueFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Review due" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any date</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="30">Next 30d</SelectItem>
                <SelectItem value="60">Next 60d</SelectItem>
                <SelectItem value="90">Next 90d</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table className="table-fixed w-full">
            <colgroup>
              {/* Name / Classification */}
              <col className="w-[20%]" />
              {/* Owner / Author */}
              <col className="w-[12%]" />
              {/* Version */}
              <col className="w-[6%]" />
              {/* Status */}
              <col className="w-[8%]" />
              {/* Effective */}
              <col className="w-[7%]" />
              {/* Attestation % */}
              <col className="w-[7%]" />
              {/* Exceptions */}
              <col className="w-[6%]" />
              {/* Links */}
              <col className="w-[12%]" />
              {/* Updated */}
              <col className="w-[8%]" />
              {/* Review Date */}
              <col className="w-[8%]" />
              {/* Actions (only for edit-capable roles) */}
              {canEdit && <col className="w-[6%]" />}
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Classification</TableHead>
                <TableHead>Owner / Author</TableHead>
                <TableHead className="text-center">Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Effective</TableHead>
                <TableHead className="text-center">Attestation %</TableHead>
                <TableHead className="text-center">Exceptions</TableHead>
                <TableHead>Links</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Review Date</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolicies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 11 : 10} className="text-center text-muted-foreground">
                    No policies found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium truncate" title={policy.name}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[260px]">{policy.name}</span>
                        {policy.classification && (
                          <Badge variant="outline" className="capitalize">{policy.classification}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{policy.profiles?.full_name || "Unassigned"}</span>
                        {policy.author && <span className="text-xs text-muted-foreground">Author: {policy.author}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center">{policy.version || "-"}</TableCell>
                    <TableCell>
                      {(() => {
                        const st = derivedStatus(policy);
                        return <Badge variant={statusBadgeVariant(st)} className="capitalize">{st.replace("_", " ")}</Badge>;
                      })()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center">
                      {policy.effective_date ? new Date(policy.effective_date).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center">
                      {attestationByPolicy[policy.id]?.percent != null ? (
                        <Button variant="link" className="p-0 h-auto" onClick={() => openRoster(policy)}>
                          {attestationByPolicy[policy.id]?.percent}%
                        </Button>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center">
                      <Button variant="link" className="p-0 h-auto" onClick={() => openExceptions(policy)}>
                        {exceptionCountByPolicy[policy.id] ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{usageByPolicy[policy.id]?.controls ?? 0} ctrls</Badge>
                        <Badge variant="secondary">{usageByPolicy[policy.id]?.risks ?? 0} risks</Badge>
                        <Button variant="ghost" size="sm" onClick={() => openLinks(policy)}>
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openFilesDialog(policy)}>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {policy.updated_at ? new Date(policy.updated_at).toLocaleDateString() : (policy.created_at ? new Date(policy.created_at).toLocaleDateString() : "-")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {policy.review_date ? new Date(policy.review_date).toLocaleDateString() : "-"}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(policy)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openHistory(policy)}>
                            <History className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openApprovals(policy)}>
                            <UserCheck className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => startCampaign(policy)}>
                            <Megaphone className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPolicyToDelete(policy.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPolicy ? "Edit Policy" : "Add New Policy"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner">Owner</Label>
                <Select
                  value={formData.owner}
                  onValueChange={(value) => setFormData({ ...formData, owner: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.full_name || owner.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Author name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classification">Classification</Label>
                <Select value={formData.classification} onValueChange={(value) => setFormData({ ...formData, classification: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review_date">Review Date</Label>
                <Input
                  id="review_date"
                  type="date"
                  value={formData.review_date}
                  onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effective_date">Effective Date</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attestation_percent">Attestation %</Label>
                <Input
                  id="attestation_percent"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.attestation_percent}
                  onChange={(e) => setFormData({ ...formData, attestation_percent: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exceptions_count">Exceptions</Label>
                <Input
                  id="exceptions_count"
                  type="number"
                  min={0}
                  value={formData.exceptions_count}
                  onChange={(e) => setFormData({ ...formData, exceptions_count: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., iso27001, hr, security"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supersedes">Supersedes</Label>
                <Select
                  value={formData.supersedes_id}
                  onValueChange={(value) => setFormData({ ...formData, supersedes_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select prior policy" />
                  </SelectTrigger>
                  <SelectContent>
                    {policies
                      .filter((p) => !selectedPolicy || p.id !== selectedPolicy.id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retention">Retention (months)</Label>
                <Input
                  id="retention"
                  type="number"
                  min={0}
                  value={formData.retention_period_months}
                  onChange={(e) => setFormData({ ...formData, retention_period_months: e.target.value })}
                />
              </div>
            </div>

            {selectedPolicy && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="change_summary">Change summary</Label>
                  <Input
                    id="change_summary"
                    value={formData.change_summary}
                    onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                    placeholder="Brief summary of changes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="change_type">Change type</Label>
                  <Select value={formData.change_type} onValueChange={(value) => setFormData({ ...formData, change_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">Minor (1.0 → 1.1)</SelectItem>
                      <SelectItem value="major">Major (1.x → 2.0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {loading || uploading ? "Saving..." : selectedPolicy ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
  </Dialog>

      {/* Approvals modal */}
      <Dialog open={approvalsDialogOpen} onOpenChange={setApprovalsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Policy Approvals</DialogTitle>
          </DialogHeader>
          {approvalsPolicy ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">{approvalsPolicy.name} • Version {approvalsPolicy.version}</div>
              <div>
                <div className="font-medium mb-2">Existing approvals</div>
                {existingApprovals.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No approvals yet.</div>
                ) : (
                  existingApprovals.map((a) => (
                    <div key={a.id} className="flex justify-between border rounded p-2 mb-2">
                      <div>
                        <div className="text-sm">Approver: {a.approver_name || a.approver_id}</div>
                        <div className="text-xs text-muted-foreground">{a.status} • {new Date(a.approved_at).toLocaleString()}</div>
                      </div>
                      {a.comment && <div className="text-xs italic max-w-[40%]">“{a.comment}”</div>}
                    </div>
                  ))
                )}
              </div>
              {canEdit && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Approver</Label>
                    <Select value={approverId} onValueChange={setApproverId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select approver" />
                      </SelectTrigger>
                      <SelectContent>
                        {owners.map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.full_name || o.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Comment</Label>
                    <Input value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} placeholder="Approval note" />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setApprovalsDialogOpen(false)}>Close</Button>
                {canEdit && (
                  <Button disabled={!approverId} onClick={recordApproval}>Record Approval</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No policy selected.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Attestation roster modal */}
      <Dialog open={rosterDialogOpen} onOpenChange={setRosterDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Attestation Roster</DialogTitle>
          </DialogHeader>
          {rosterCampaign ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Due {rosterCampaign.due_date ? new Date(rosterCampaign.due_date).toLocaleDateString() : "N/A"} • Status {rosterCampaign.status}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {rosterEntries.map((r) => (
                  <div key={r.id} className="flex justify-between border rounded p-2">
                    <div>
                      <div className="font-medium">{r.profiles?.full_name || r.user_id}</div>
                      <div className="text-xs text-muted-foreground">{r.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">{r.acknowledged_at ? new Date(r.acknowledged_at).toLocaleString() : "-"}</div>
                      {(currentUserId && r.user_id === currentUserId) && (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Comment"
                            value={attestNotes[r.id] || ""}
                            onChange={(e) => setAttestNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          />
                          <Button size="sm" onClick={() => acknowledgeAttestation(r.id)}>Attest</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No campaign selected.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exceptions modal */}
      <Dialog open={exceptionsDialogOpen} onOpenChange={setExceptionsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Policy Exceptions</DialogTitle>
          </DialogHeader>
          {exceptionsForPolicy.length === 0 ? (
            <div className="text-sm text-muted-foreground">No open exceptions.</div>
          ) : (
            exceptionsForPolicy.map((ex) => (
              <div key={ex.id} className="flex justify-between border rounded p-2 mb-2">
                <div>
                  <div className="font-medium">{ex.title || ex.scope || "Exception"}</div>
                  <div className="text-xs text-muted-foreground">Requester {ex.requester_id} • Approver {ex.approver_id}</div>
                </div>
                <div className="text-xs text-muted-foreground">Expires {ex.expiry_date ? new Date(ex.expiry_date).toLocaleDateString() : "-"}</div>
              </div>
            ))
          )}
        </DialogContent>
      </Dialog>

      {/* Create Attestation Campaign */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Start Attestation Campaign</DialogTitle>
          </DialogHeader>
          {campaignPolicy ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">{campaignPolicy.name} • Version {campaignPolicy.version}</div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target audience</Label>
                  <Select value={campaignTarget} onValueChange={setCampaignTarget}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="role">By role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {campaignTarget === "role" && (
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={campaignRole} onValueChange={setCampaignRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input type="date" value={campaignDueDate} onChange={(e) => setCampaignDueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Training link (optional)</Label>
                  <Input placeholder="https://..." value={campaignTrainingUrl} onChange={(e) => setCampaignTrainingUrl(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
                <Button onClick={createCampaign}>Create Campaign</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No policy selected.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Files list modal */}
      <Dialog open={filesDialogOpen} onOpenChange={setFilesDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Policy Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {filesForPolicy.length === 0 ? (
              <p className="text-muted-foreground">No files for this policy.</p>
            ) : (
              filesForPolicy.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded border p-2">
                  <div className="truncate">
                    <div className="font-medium truncate" title={f.file_name}>{f.file_name}</div>
                    <div className="text-sm text-muted-foreground">{f.file_type} • Uploaded {new Date(f.uploaded_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const cls = (filesPolicy?.classification || "").toLowerCase();
                        if (cls === "confidential" && role === "viewer") {
                          toast({ variant: "destructive", title: "Restricted", description: "Confidential files cannot be previewed by viewers." });
                          return;
                        }
                        try {
                          const { signed_url } = await signPolicyFile(f.storage_path);
                          setPreviewFile({ ...f, signed_url });
                          setPreviewOpen(true);
                        } catch (err: any) {
                          toast({ variant: "destructive", title: "Preview failed", description: err?.message || "Unable to open file" });
                        }
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => replaceLatestFile(f.policy_id)}>
                        <RefreshCcw className="h-4 w-4 mr-1" /> Replace
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Versions history modal */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Policy History</DialogTitle>
          </DialogHeader>
          {historyPolicy ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{historyPolicy.name}</div>
              {versionsForPolicy.length === 0 ? (
                <div className="text-sm text-muted-foreground">No versions recorded.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versionsForPolicy.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="whitespace-nowrap">{v.version}</TableCell>
                        <TableCell className="truncate" title={v.change_summary}>{v.change_summary || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{v.created_at ? new Date(v.created_at).toLocaleDateString() : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No policy selected.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Linked controls/risks modal */}
      <Dialog open={linksDialogOpen} onOpenChange={setLinksDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Linked Controls & Risks</DialogTitle>
          </DialogHeader>
          {linksPolicy ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-medium mb-2">Controls</div>
                {linkedControls.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No controls linked.</div>
                ) : (
                  linkedControls.map((c) => (
                    <div key={c.control_id} className="flex justify-between border rounded p-2 mb-2">
                      <div>
                        <div className="font-medium">{c.controls?.name || c.control_id}</div>
                        <div className="text-xs text-muted-foreground">Owner {c.controls?.owner || "-"}</div>
                      </div>
                      <Badge variant="secondary" className="capitalize">{c.controls?.status || "-"}</Badge>
                    </div>
                  ))
                )}
              </div>
              <div>
                <div className="font-medium mb-2">Risks</div>
                {linkedRisks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No risks linked.</div>
                ) : (
                  linkedRisks.map((r) => (
                    <div key={r.risk_id} className="flex justify-between border rounded p-2 mb-2">
                      <div>
                        <div className="font-medium">{r.risks?.name || r.risk_id}</div>
                        <div className="text-xs text-muted-foreground">Owner {r.risks?.owner || "-"}</div>
                      </div>
                      <Badge variant="secondary" className="capitalize">{r.risks?.status || "-"}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No policy selected.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Inline preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {previewFile ? (
            previewFile.file_type?.includes("pdf") ? (
              <iframe src={previewFile.signed_url || previewFile.file_url} className="w-full h-[70vh] rounded" />
            ) : previewFile.file_name?.toLowerCase().endsWith(".md") ? (
              <MarkdownPreview url={previewFile.signed_url || previewFile.file_url} />
            ) : (
              <div className="text-sm text-muted-foreground">Preview not supported for this file type. You can download and view locally.</div>
            )
          ) : (
            <div className="text-sm text-muted-foreground">No file selected</div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this policy. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const CampaignList = ({ onOpenRoster }: { onOpenRoster: (c: any) => void }) => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        const orgId = await getRequiredOrgId();
        const { data: campaigns } = await supabase
          .from("attestation_campaigns")
          .select("id, policy_id, due_date, status")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(8);
        const list = campaigns || [];
        if (list.length === 0) {
          setItems([]);
          return;
        }
        const ids = list.map((c: any) => c.id);
        const polIds = Array.from(new Set(list.map((c: any) => c.policy_id)));
        const { data: pols } = await supabase
          .from("policies")
          .select("id, name")
          .in("id", polIds)
          .eq("org_id", orgId);
        const nameById: Record<string, string> = {};
        for (const p of pols || []) nameById[p.id as string] = p.name as string;
        const { data: attRows } = await supabase
          .from("attestations")
          .select("id, campaign_id, status")
          .in("campaign_id", ids)
          .eq("org_id", orgId);
        const counts: Record<string, { total: number; ack: number }> = {};
        for (const a of attRows || []) {
          const k = a.campaign_id as string;
          if (!counts[k]) counts[k] = { total: 0, ack: 0 };
          counts[k].total += 1;
          if (a.status === "acknowledged") counts[k].ack += 1;
        }
        const final = list.map((c: any) => ({
          ...c,
          policy_name: nameById[c.policy_id] || c.policy_id,
          percent: counts[c.id]?.total ? Math.round((counts[c.id].ack / counts[c.id].total) * 100) : 0,
        }));
        setItems(final);
      } catch {
        setItems([]);
      }
    };
    run();
  }, []);

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground">No recent campaigns.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {items.map((c) => (
        <div key={c.id} className="flex justify-between border rounded p-2">
          <div>
            <div className="font-medium">{c.policy_name}</div>
            <div className="text-xs text-muted-foreground">Due {c.due_date ? new Date(c.due_date).toLocaleDateString() : "N/A"} • {c.status}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm">{c.percent}%</div>
            <Button size="sm" variant="ghost" onClick={() => onOpenRoster(c)}>Open</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Policies;

// Simple markdown preview component without extra deps
const MarkdownPreview = ({ url }: { url: string }) => {
  const [text, setText] = useState<string>("");
  useEffect(() => {
    const run = async () => {
      try {
        const resp = await fetch(url);
        const t = await resp.text();
        setText(t);
      } catch (e) {
        setText("Failed to load markdown file.");
      }
    };
    run();
  }, [url]);
  return (
    <div className="prose max-w-none dark:prose-invert">
      <pre className="whitespace-pre-wrap break-words">{text}</pre>
    </div>
  );
};
