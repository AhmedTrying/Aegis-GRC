import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "@/hooks/use-toast";

interface TreatmentPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riskId: string;
  plan?: any;
  onSuccess: () => void;
}

export const TreatmentPlanDialog = ({
  open,
  onOpenChange,
  riskId,
  plan,
  onSuccess,
}: TreatmentPlanDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    action_title: "",
    action_type: "mitigate",
    description: "",
    responsible_user: "",
    due_date: "",
    status: "not_started",
    cost_estimate: "",
    evidence_url: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (plan) {
      setFormData({
        action_title: plan.action_title || "",
        action_type: plan.action_type || "mitigate",
        description: plan.description || "",
        responsible_user: plan.responsible_user || "",
        due_date: plan.due_date || "",
        status: plan.status || "not_started",
        cost_estimate: plan.cost_estimate?.toString() || "",
        evidence_url: plan.evidence_url || "",
      });
    } else {
      setFormData({
        action_title: "",
        action_type: "mitigate",
        description: "",
        responsible_user: "",
        due_date: "",
        status: "not_started",
        cost_estimate: "",
        evidence_url: "",
      });
    }
  }, [plan, open]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email");
    
    if (data) {
      setUsers(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      risk_id: riskId,
      action_title: formData.action_title,
      action_type: formData.action_type,
      description: formData.description,
      responsible_user: formData.responsible_user || null,
      due_date: formData.due_date || null,
      status: formData.status,
      cost_estimate: formData.cost_estimate ? parseFloat(formData.cost_estimate) : null,
      evidence_url: formData.evidence_url || null,
    };

    let error;
    if (plan) {
      ({ error } = await supabase
        .from("treatment_plans")
        .update(payload)
        .eq("id", plan.id));
    } else {
      ({ error } = await supabase
        .from("treatment_plans")
        .insert(payload));
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
        description: plan ? "Treatment plan updated" : "Treatment plan created",
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
          <DialogTitle>{plan ? "Edit Treatment Plan" : "Add Treatment Plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="action_title">Action Title *</Label>
            <Input
              id="action_title"
              value={formData.action_title}
              onChange={(e) => setFormData({ ...formData, action_title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="action_type">Action Type *</Label>
              <Select
                value={formData.action_type}
                onValueChange={(value) => setFormData({ ...formData, action_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accept">Accept</SelectItem>
                  <SelectItem value="mitigate">Mitigate</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="avoid">Avoid</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsible_user">Responsible User</Label>
              <Select
                value={formData.responsible_user}
                onValueChange={(value) => setFormData({ ...formData, responsible_user: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_estimate">Cost Estimate</Label>
              <Input
                id="cost_estimate"
                type="number"
                step="0.01"
                value={formData.cost_estimate}
                onChange={(e) => setFormData({ ...formData, cost_estimate: e.target.value })}
              />
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
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : plan ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
