import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/integrations/supabase/audit";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, UserPlus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgUsage } from "@/hooks/useOrgUsage";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "admin" | "manager" | "viewer";
}

const Users = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const { limits, counts } = useOrgUsage();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [editRole, setEditRole] = useState<ProfileRow["role"]>("viewer");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    full_name: "",
    password: "",
    confirmPassword: "",
    role: "viewer" as ProfileRow["role"],
    requireReset: false,
  });
  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: "Weak", className: "text-red-500" };
    if (score === 2) return { label: "Fair", className: "text-yellow-600" };
    if (score === 3) return { label: "Good", className: "text-green-600" };
    return { label: "Strong", className: "text-green-700" };
  };
  // inline per-row delete confirmation via AlertDialog; no global delete state

  useEffect(() => {
    fetchProfiles();
  }, []);

  const filterProfiles = useCallback(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setFilteredProfiles(profiles);
      return;
    }
    setFilteredProfiles(
      profiles.filter((p) => [p.full_name || "", p.email || "", p.role].some((v) => v.toLowerCase().includes(q)))
    );
  }, [profiles, searchQuery]);

  useEffect(() => {
    filterProfiles();
  }, [filterProfiles]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      try {
        const orgId = await getRequiredOrgId();
        const { data: orgRow } = await supabase.from("organizations").select("id, owner_id").eq("id", orgId).single();
        setOwnerId((orgRow as any)?.owner_id || null);
      } catch { setOwnerId(null); }
    })();
  }, []);

  const fetchProfiles = async () => {
    const orgId = await getRequiredOrgId();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load users" });
    } else if (data) {
      setProfiles(data as ProfileRow[]);
    }
  };

  

  const handleEdit = (profile: ProfileRow) => {
    setSelectedProfile(profile);
    setEditRole(profile.role);
    setDialogOpen(true);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    try {
      if (editRole === "admin") {
        const { error } = await supabase.functions.invoke("org-admin-associations", { body: { action: "add_admin", profile_id: selectedProfile.id } });
        if (error) throw error;
      } else if (selectedProfile.role === "admin" && (editRole === "manager" || editRole === "viewer")) {
        const { error } = await supabase.functions.invoke("org-admin-associations", { body: { action: "remove_admin", profile_id: selectedProfile.id, new_role: editRole } });
        if (error) throw error;
      } else {
        const { error } = await supabase.functions.invoke("org-admin-associations", { body: { action: "set_role", profile_id: selectedProfile.id, new_role: editRole } });
        if (error) throw error;
      }
      toast({ title: "Success", description: "Role updated" });
      setDialogOpen(false);
      fetchProfiles();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to update role" });
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (inviteForm.password !== inviteForm.confirmPassword) {
        toast({ variant: "destructive", title: "Passwords do not match", description: "Please confirm the password." });
        return;
      }
      if (inviteForm.password.length < 8) {
        toast({ variant: "destructive", title: "Weak password", description: "Use at least 8 characters." });
        return;
      }
      await getRequiredOrgId();
      const { data, error } = await supabase.functions.invoke("add-user", {
        body: {
          email: inviteForm.email,
          full_name: inviteForm.full_name,
          password: inviteForm.password,
          role: inviteForm.role,
          require_password_reset: inviteForm.requireReset,
        },
      });
      if (error) {
        const ctx = (error as any)?.context || {} as any;
        let msg = ctx.error || ctx.message || error.message || "Edge function error";
        try {
          if (ctx.body && typeof ctx.body === "string") {
            const parsed = JSON.parse(ctx.body);
            if (parsed?.error) msg = parsed.error;
          }
        } catch { /* ignore JSON parse */ }
        throw new Error(msg);
      }
      const addUserResponse = (data ?? null) as { error?: string } | null;
      if (addUserResponse?.error) {
        throw new Error(addUserResponse.error);
      }
      toast({ title: "User created", description: inviteForm.email });
      try {
        await recordAudit({ entity_type: "user_management", entity_id: inviteForm.email, action: "invite_user", after_data: { role: inviteForm.role } });
      } catch { void 0; }
      setInviteDialogOpen(false);
      setInviteForm({ email: "", full_name: "", password: "", confirmPassword: "", role: "viewer", requireReset: false });
      fetchProfiles();
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Failed to add user";
      if (/404/.test(String(msg))) msg = "Function add-user not deployed. Deploy with: supabase functions deploy add-user";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const handleDeleteUser = async (profile: ProfileRow) => {
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { id: profile.id },
      });
      if (error) {
        const ctx = (error as any)?.context || {} as any;
        let msg = ctx.error || ctx.message || error.message || "Edge function error";
        try { if (ctx.body && typeof ctx.body === "string") { const parsed = JSON.parse(ctx.body); if (parsed?.error) msg = parsed.error; } } catch { void 0; }
        throw new Error(msg);
      }
      toast({ title: "User deleted", description: profile.email || profile.id });
      try { await recordAudit({ entity_type: "user_management", entity_id: profile.id, action: "delete_user", before_data: { role: profile.role } }); } catch { void 0; }
      fetchProfiles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete user";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const handleDeactivateUser = async (profile: ProfileRow) => {
    try {
      const { error } = await supabase.functions.invoke("deactivate-user", { body: { id: profile.id } });
      if (error) throw error;
      toast({ title: "User deactivated", description: profile.email || profile.id });
      try { await recordAudit({ entity_type: "user_management", entity_id: profile.id, action: "deactivate_user" }); } catch { void 0; }
      fetchProfiles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to deactivate user";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const handleReactivateUser = async (profile: ProfileRow) => {
    try {
      const { error } = await supabase.functions.invoke("reactivate-user", { body: { id: profile.id } });
      if (error) throw error;
      toast({ title: "User reactivated", description: profile.email || profile.id });
      try { await recordAudit({ entity_type: "user_management", entity_id: profile.id, action: "reactivate_user" }); } catch { void 0; }
      fetchProfiles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reactivate user";
      toast({ variant: "destructive", title: "Error", description: msg });
    }
  };

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const fetchAuditLogs = useCallback(async () => {
    try {
      const orgId = await getRequiredOrgId();
      const { data } = await supabase
        .from("audit_logs")
        .select("id, actor_email, entity_type, action, created_at, after_data")
        .eq("org_id", orgId)
        .in("entity_type", ["profiles", "users", "auth", "user_management"]) as any;
      setAuditLogs((data as any[]) || []);
    } catch {
      setAuditLogs([]);
    }
  }, []);

  useEffect(() => { fetchAuditLogs(); }, []);

  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Admin can view and update user roles</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/settings")}>Organization Settings</Button>
            <Button variant="outline" onClick={async ()=>{
              try {
                const orgId = await getRequiredOrgId();
                const { error } = await supabase
                  .from("profiles")
                  .update({ org_id: orgId })
                  .is("org_id", null);
                if (error) throw error;
                try { await recordAudit({ entity_type: "user_management", action: "adopt_unassigned_profiles", after_data: { org_id: orgId } }); } catch { void 0; }
                toast({ title: "Attached", description: "Unassigned users linked to this organization" });
                fetchProfiles();
              } catch (e: any) {
                toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to attach users" });
              }
            }}>Attach Unassigned Users</Button>
            <Button onClick={() => setInviteDialogOpen(true)} disabled={!!limits && !!counts && counts.users >= limits.max_users} title={limits && counts && counts.users >= limits.max_users ? 'User limit reached — upgrade in Settings' : undefined}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        )}
      </div>

      {!isAdmin ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Access denied. Only administrators can manage users.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              {limits && counts && counts.users >= limits.max_users && (
                <div className="mb-4 rounded border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm">
                  User limit reached for your plan. Visit Settings to upgrade.
                </div>
              )}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, email, or role"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name || "-"}</TableCell>
                        <TableCell>{p.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={p.role === "admin" ? "default" : p.role === "manager" ? "secondary" : "outline"}>
                            {p.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(p)} disabled={p.id === ownerId || p.id === currentUserId}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeactivateUser(p)} title="Deactivate user">Disable</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleReactivateUser(p)} title="Reactivate user">Enable</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will delete the user and their profile. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(p)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
      </Table>
    </CardContent>
  </Card>

  <Card className="mt-6">
    <CardHeader>
      <CardTitle>Audit Logs</CardTitle>
    </CardHeader>
    <CardContent>
      {auditLogs.length === 0 ? (
        <div className="text-sm text-muted-foreground">No audit logs found</div>
      ) : (
        <div className="max-h-72 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.slice(0,100).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.actor_email || "-"}</TableCell>
                  <TableCell>{l.entity_type}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>{l.created_at?.slice(0,19)?.replace('T',' ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Role</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateRole} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={editRole} onValueChange={(v) => setEditRole(v as ProfileRow["role"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">admin</SelectItem>
                      <SelectItem value="manager">manager</SelectItem>
                      <SelectItem value="viewer">viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite_email">Email *</Label>
                  <Input
                    id="invite_email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite_full_name">Full Name</Label>
                  <Input
                    id="invite_full_name"
                    value={inviteForm.full_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  />
                </div>
              <div className="space-y-2">
                <Label htmlFor="invite_password">Password *</Label>
                <Input
                  id="invite_password"
                  type="password"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  required
                />
                {inviteForm.password && (
                  <p className={`text-xs ${getPasswordStrength(inviteForm.password).className}`}>
                    Strength: {getPasswordStrength(inviteForm.password).label}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite_confirm_password">Confirm Password *</Label>
                <Input
                  id="invite_confirm_password"
                  type="password"
                  value={inviteForm.confirmPassword}
                  onChange={(e) => setInviteForm({ ...inviteForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite_role">Role *</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as ProfileRow["role"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="manager">manager</SelectItem>
                    <SelectItem value="viewer">viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="invite_require_reset"
                  type="checkbox"
                  checked={inviteForm.requireReset}
                  onChange={(e) => setInviteForm({ ...inviteForm, requireReset: e.target.checked })}
                />
                <Label htmlFor="invite_require_reset">Require password reset on first login</Label>
              </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create User</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete confirmation dialog */}
        </>
      )}
    </div>
  );
};

export default Users;