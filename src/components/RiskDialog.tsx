import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

interface RiskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  risk?: any;
}

export const RiskDialog = ({ open, onOpenChange, onSuccess, risk }: RiskDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [owners, setOwners] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    owner: "",
    likelihood: "1",
    impact: "1",
    status: "open",
    inherent_likelihood: "",
    inherent_impact: "",
    category: "",
    cause: "",
    consequence: "",
    affected_asset: "",
    department: "",
    next_review_date: "",
    delegate_owner: "",
    closure_rationale: "",
    closure_date: "",
  });

  useEffect(() => {
    fetchOwners();
  }, []);

  useEffect(() => {
    if (risk) {
      setFormData({
        title: risk.title || "",
        description: risk.description || "",
        owner: risk.owner || "",
        likelihood: risk.likelihood?.toString() || "1",
        impact: risk.impact?.toString() || "1",
        status: risk.status || "open",
        inherent_likelihood: risk.inherent_likelihood?.toString() || "",
        inherent_impact: risk.inherent_impact?.toString() || "",
        category: risk.category || "",
        cause: risk.cause || "",
        consequence: risk.consequence || "",
        affected_asset: risk.affected_asset || "",
        department: risk.department || "",
        next_review_date: risk.next_review_date || "",
        delegate_owner: risk.delegate_owner || "",
        closure_rationale: risk.closure_rationale || "",
        closure_date: risk.closure_date || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        owner: "",
        likelihood: "1",
        impact: "1",
        status: "open",
        inherent_likelihood: "",
        inherent_impact: "",
        category: "",
        cause: "",
        consequence: "",
        affected_asset: "",
        department: "",
        next_review_date: "",
        delegate_owner: "",
        closure_rationale: "",
        closure_date: "",
      });
    }
  }, [risk, open]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation: require inherent if residual present; residual must not exceed inherent
    const residualLikelihood = parseInt(formData.likelihood);
    const residualImpact = parseInt(formData.impact);
    const inherentLikelihood = formData.inherent_likelihood ? parseInt(formData.inherent_likelihood) : NaN;
    const inherentImpact = formData.inherent_impact ? parseInt(formData.inherent_impact) : NaN;

    if (Number.isNaN(inherentLikelihood) || Number.isNaN(inherentImpact)) {
      setLoading(false);
      toast({ variant: "destructive", title: "Missing inherent values", description: "Set Inherent Likelihood and Inherent Impact before saving residual." });
      return;
    }
    if (residualLikelihood > inherentLikelihood || residualImpact > inherentImpact) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Residual likelihood must be ≤ inherent likelihood",
        description: "For likelihood and impact, residual must be ≤ inherent.",
      });
      return;
    }

    // Validation: require Owner and Next Review for open/in_progress
    if ((formData.status === "open" || formData.status === "in_progress") && (!formData.owner || !formData.next_review_date)) {
      setLoading(false);
      toast({ variant: "destructive", title: "Owner/Next review required", description: "For open or in-progress risks, Owner and Next Review Date are required." });
      return;
    }

    // Validation: require closure details when status is closed
    if (formData.status === "closed") {
      if (!formData.closure_rationale || !formData.closure_date) {
        setLoading(false);
        toast({ variant: "destructive", title: "Closure details required", description: "Provide Closure Rationale and Closure Date when closing a risk." });
        return;
      }
    }

    const payload = {
      ...formData,
      likelihood: residualLikelihood,
      impact: residualImpact,
      owner: formData.owner || null,
      inherent_likelihood: formData.inherent_likelihood ? parseInt(formData.inherent_likelihood) : null,
      inherent_impact: formData.inherent_impact ? parseInt(formData.inherent_impact) : null,
      category: formData.category || null,
      cause: formData.cause || null,
      consequence: formData.consequence || null,
      affected_asset: formData.affected_asset || null,
      department: formData.department || null,
      next_review_date: formData.next_review_date || null,
      delegate_owner: formData.delegate_owner || null,
      // Optional fields (require migration):
      closure_rationale: formData.closure_rationale || null,
      closure_date: formData.closure_date || null,
    };

    const orgId = await getRequiredOrgId();
    let error;
    if (risk) {
      ({ error } = await supabase
        .from("risks")
        .update(payload)
        .eq("id", risk.id)
        .eq("org_id", orgId));
    } else {
      ({ error } = await supabase
        .from("risks")
        .insert({ ...payload, org_id: orgId }));
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
        description: risk ? "Risk updated" : "Risk created",
      });
      onSuccess();
      onOpenChange(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{risk ? "Edit Risk" : "Add New Risk"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delegate_owner">Delegate</Label>
              <Select value={formData.delegate_owner} onValueChange={(value) => setFormData({ ...formData, delegate_owner: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delegate (optional)" />
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
              <Label htmlFor="next_review_date">Next Review Date</Label>
              <Input
                id="next_review_date"
                type="date"
                value={formData.next_review_date || ""}
                onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inherent Likelihood</Label>
              <Select value={formData.inherent_likelihood} onValueChange={(value) => setFormData({ ...formData, inherent_likelihood: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="optional" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Inherent Impact</Label>
              <Select value={formData.inherent_impact} onValueChange={(value) => setFormData({ ...formData, inherent_impact: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="optional" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Dept.</Label>
              <Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cause">Cause</Label>
              <Input id="cause" value={formData.cause} onChange={(e) => setFormData({ ...formData, cause: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consequence">Consequence</Label>
              <Input id="consequence" value={formData.consequence} onChange={(e) => setFormData({ ...formData, consequence: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="affected_asset">Affected Asset/System</Label>
              <Input id="affected_asset" value={formData.affected_asset} onChange={(e) => setFormData({ ...formData, affected_asset: e.target.value })} />
            </div>
          </div>

          {/* Meta section */}
          <div className="mb-2">
            <p className="text-sm font-medium text-muted-foreground">Meta</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Select value={formData.owner} onValueChange={(value) => setFormData({ ...formData, owner: value })}>
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
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Residual section */}
          <div className="mt-2">
            <p className="text-sm font-medium text-muted-foreground">Residual</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="likelihood">Residual Likelihood (1-5) *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground cursor-help">?</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        1 Rare • 2 Unlikely • 3 Possible • 4 Likely • 5 Almost certain
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={formData.likelihood} onValueChange={(value) => setFormData({ ...formData, likelihood: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="impact">Residual Impact (1-5) *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground cursor-help">?</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        1 Negligible • 2 Minor • 3 Moderate • 4 Major • 5 Severe
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={formData.impact} onValueChange={(value) => setFormData({ ...formData, impact: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category / Department picklists */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category || ""} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Security",
                    "Compliance",
                    "Operational",
                    "Financial",
                    "Legal",
                    "Strategic",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={formData.department || ""} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "IT",
                    "Security",
                    "Operations",
                    "Finance",
                    "HR",
                    "Legal",
                    "Sales",
                    "Marketing",
                    "Product",
                  ].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.status === "closed" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="closure_rationale">Closure Rationale</Label>
                <Textarea id="closure_rationale" value={formData.closure_rationale || ""} onChange={(e) => setFormData({ ...formData, closure_rationale: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closure_date">Closure Date</Label>
                <Input id="closure_date" type="date" value={formData.closure_date || ""} onChange={(e) => setFormData({ ...formData, closure_date: e.target.value })} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : risk ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
