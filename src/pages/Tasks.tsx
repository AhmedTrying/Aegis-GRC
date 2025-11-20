import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
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
import { Plus, Edit, Filter, FileDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import type { Tables } from "@/integrations/supabase/types";

const Tasks = () => {
  type TaskWithProfile = Tables<"tasks"> & { profiles?: { full_name: string | null } | null };
  type MinimalProfile = Pick<Tables<"profiles">, "id" | "full_name" | "email">;
  const [tasks, setTasks] = useState<TaskWithProfile[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskWithProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithProfile | null>(null);
  const { role } = useUserRole();
  const [users, setUsers] = useState<MinimalProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    assigned_to: "",
    related_type: "risk",
    due_date: "",
    status: "open",
  });

  const fetchUsers = useCallback(async () => {
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("org_id", orgId);
    if (data) {
      setUsers(data as MinimalProfile[]);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    const orgId = await getRequiredOrgId();
    const { data, error } = await supabase
      .from("tasks")
      .select("*, profiles!tasks_assigned_to_fkey(full_name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch tasks",
      });
    } else if (data) {
      setTasks(data as TaskWithProfile[]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchTasks();
  }, [fetchUsers, fetchTasks]);

  // Initialize filters from query params (e.g., filter=overdue)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    setOverdueOnly(filter === "overdue");
  }, []);

  const filterTasks = useCallback(() => {
    let list = tasks;
    if (showMyTasks) {
      list = list.filter((t) => t.assigned_to === currentUserId);
    }
    if (overdueOnly) {
      const today = new Date();
      today.setHours(0,0,0,0);
      list = list.filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) < today);
    }
    setFilteredTasks(list);
  }, [showMyTasks, tasks, currentUserId, overdueOnly]);

  useEffect(() => {
    filterTasks();
  }, [filterTasks]);

  // role provided by useUserRole; still capture user id
  useEffect(() => {
    const loadUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUserId();
  }, []);

  

  const handleAdd = () => {
    setSelectedTask(null);
    setFormData({
      title: "",
      assigned_to: "",
      related_type: "risk",
      due_date: "",
      status: "open",
    });
    setDialogOpen(true);
  };

  const handleEdit = (task: TaskWithProfile) => {
    setSelectedTask(task);
    setFormData({
      title: task.title || "",
      assigned_to: task.assigned_to || "",
      related_type: task.related_type || "risk",
      due_date: task.due_date || "",
      status: task.status || "open",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title: formData.title,
      assigned_to: formData.assigned_to || null,
      related_type: formData.related_type,
      due_date: formData.due_date || null,
      status: formData.status,
    };

    const orgId = await getRequiredOrgId();
    let error;
    if (selectedTask) {
      ({ error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", selectedTask.id)
        .eq("org_id", orgId));
    } else {
      ({ error } = await supabase
        .from("tasks")
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
        description: selectedTask ? "Task updated" : "Task created",
      });
      fetchTasks();
      setDialogOpen(false);
    }

    setLoading(false);
  };

  const canEdit = role === "admin" || role === "manager";

  const toggleTaskStatus = async (task: TaskWithProfile) => {
    try {
      const orgId = await getRequiredOrgId();
      const next = task.status === "done" ? "open" : "done";
      const { error } = await supabase
        .from("tasks")
        .update({ status: next })
        .eq("id", task.id)
        .eq("org_id", orgId);
      if (error) throw error;
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update status";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const exportTasksCsv = () => {
    const list = filteredTasks.length ? filteredTasks : tasks;
    const header = [
      "Title",
      "Assigned To",
      "Related Type",
      "Related ID",
      "Due Date",
      "Status",
      "Created",
      "Updated",
    ];
    const rows = list.map((t: any) => [
      t.title || "",
      t.profiles?.full_name || "Unassigned",
      t.related_type || "",
      t.related_id || "",
      t.due_date || "",
      t.status || "",
      t.created_at || "",
      t.updated_at || "",
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportTasksJson = () => {
    const list = filteredTasks.length ? filteredTasks : tasks;
    const payload = list.map((t: any) => ({
      id: t.id,
      title: t.title || "",
      assigned_to_name: t.profiles?.full_name || null,
      related_type: t.related_type || "",
      related_id: t.related_id || null,
      due_date: t.due_date || null,
      status: t.status || "",
      created_at: t.created_at || null,
      updated_at: t.updated_at || null,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Tasks</h2>
          <p className="text-muted-foreground">Track and manage tasks across GRC activities</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showMyTasks ? "default" : "outline"}
            onClick={() => setShowMyTasks(!showMyTasks)}
          >
            <Filter className="h-4 w-4 mr-2" />
            My Tasks
          </Button>
          <Button variant="outline" onClick={exportTasksCsv}>
            <FileDown className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={exportTasksJson}>
            <FileDown className="h-4 w-4 mr-2" /> Export JSON
          </Button>
          {canEdit && (
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <colgroup>
                <col style={{ width: "260px" }} />
                <col style={{ width: "220px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "160px" }} />
                {canEdit && <col style={{ width: "120px" }} />}
              </colgroup>
              <TableHeader>
                <TableRow className="bg-slate-50/60">
                  <TableHead className="text-left">Title</TableHead>
                  <TableHead className="text-left">Assigned To</TableHead>
                  <TableHead className="text-left">Related To</TableHead>
                  <TableHead className="text-center">Due Date</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium truncate" title={task.title}>{task.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{task.profiles?.full_name || "Unassigned"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.related_type}</Badge>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {canEdit ? (
                          <Button
                            variant={task.status === "done" ? "outline" : "secondary"}
                            size="sm"
                            onClick={() => toggleTaskStatus(task)}
                          >
                            {task.status === "done" ? "Reopen" : "Mark Done"}
                          </Button>
                        ) : (
                          <Badge variant={task.status === "done" ? "secondary" : "default"}>
                            {task.status}
                          </Badge>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Edit Task" : "Add New Task"}</DialogTitle>
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
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
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
                <Label htmlFor="related_type">Related To *</Label>
                <Select
                  value={formData.related_type}
                  onValueChange={(value) => setFormData({ ...formData, related_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="control">Control</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="treatment_plan">Treatment Plan</SelectItem>
                </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
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
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : selectedTask ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
