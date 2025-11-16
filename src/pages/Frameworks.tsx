import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgUsage } from "@/hooks/useOrgUsage";
import { GitBranch, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { recordAudit } from "@/integrations/supabase/audit";

const Frameworks = () => {
  const { role } = useUserRole();
  const canEdit = role === "admin" || role === "manager";
  const { limits, counts } = useOrgUsage();

  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [controlsByFramework, setControlsByFramework] = useState<Record<string, any[]>>({});
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newFramework, setNewFramework] = useState<{ name?: string; description?: string }>({});
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingForm, setMappingForm] = useState<{ source_control_id?: string; target_framework_id?: string; target_control_id?: string; rationale?: string }>({});
  const [mappings, setMappings] = useState<any[]>([]);
  const [mapFilterTarget, setMapFilterTarget] = useState<string>("");
  const [mapFilterCode, setMapFilterCode] = useState<string>("");

  useEffect(() => {
    fetchFrameworks();
  }, []);

  const fetchFrameworks = async () => {
    const orgId = await getRequiredOrgId();
    const { data: fw } = await supabase
      .from("frameworks")
      .select("id, name, description")
      .eq("org_id", orgId)
      .order("name");
    setFrameworks(fw || []);
    if (fw && fw.length > 0) {
      const map: Record<string, any[]> = {};
      for (const f of fw) {
        const { data: ctrls } = await supabase
          .from("controls")
          .select("id, code, description, status")
          .eq("framework_id", f.id)
          .eq("org_id", orgId)
          .order("code");
        map[f.id] = ctrls || [];
      }
      setControlsByFramework(map);
    }
  };

  useEffect(() => {
    if (selectedFramework) fetchMappings(selectedFramework);
  }, [selectedFramework]);

  const fetchMappings = async (sourceFrameworkId: string) => {
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("framework_mappings")
      .select("id, source_control_id, target_framework_id, target_control_id, rationale")
      .eq("source_framework_id", sourceFrameworkId)
      .eq("org_id", orgId);
    setMappings(data || []);
  };

  const sourceControls = useMemo(() => (selectedFramework ? (controlsByFramework[selectedFramework] || []) : []), [selectedFramework, controlsByFramework]);

  const coveragePercent = useMemo(() => {
    const ctrls = sourceControls;
    if (!ctrls || ctrls.length === 0) return null;
    const compliant = ctrls.filter((c:any) => c.status === "compliant").length;
    return Math.round((compliant / ctrls.length) * 100);
  }, [sourceControls]);

  const targetCoverage = useMemo(() => {
    if (!mappings || mappings.length === 0) return [] as { id: string; name: string; percent: number }[];
    const statusById: Record<string, string> = {};
    for (const c of sourceControls) statusById[c.id as string] = c.status as string;
    const totals: Record<string, { total: number; ok: number }> = {};
    const seen: Record<string, Record<string, boolean>> = {};
    for (const m of mappings) {
      const tgtFw = m.target_framework_id as string;
      const tgtCtrl = m.target_control_id as string;
      if (!totals[tgtFw]) totals[tgtFw] = { total: 0, ok: 0 };
      if (!seen[tgtFw]) seen[tgtFw] = {};
      if (!seen[tgtFw][tgtCtrl]) {
        seen[tgtFw][tgtCtrl] = false;
        totals[tgtFw].total += 1;
      }
      const s = statusById[m.source_control_id as string] || "";
      if (s === "compliant" && seen[tgtFw][tgtCtrl] === false) {
        seen[tgtFw][tgtCtrl] = true;
        totals[tgtFw].ok += 1;
      }
    }
    const nameById: Record<string, string> = {};
    for (const f of frameworks) nameById[f.id as string] = f.name as string;
    return Object.keys(totals).map((id) => ({ id, name: nameById[id] || id, percent: totals[id].total ? Math.round((totals[id].ok / totals[id].total) * 100) : 0 }));
  }, [mappings, sourceControls, frameworks]);

  const handleAddFramework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFramework.name) {
      toast({ variant: "destructive", title: "Name required" });
      return;
    }
    const orgId = await getRequiredOrgId();
    const { data: created, error } = await supabase
      .from("frameworks")
      .insert({ name: newFramework.name, description: newFramework.description || null, org_id: orgId })
      .select("id")
      .single();
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      await recordAudit({ entity_type: "frameworks", action: "insert", entity_id: created?.id || null, after: newFramework });
      toast({ title: "Framework added" });
      setAddDialogOpen(false);
      setNewFramework({});
      fetchFrameworks();
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFramework || !mappingForm.source_control_id || !mappingForm.target_framework_id || !mappingForm.target_control_id) {
      toast({ variant: "destructive", title: "Select source, target framework and control" });
      return;
    }
    const orgId = await getRequiredOrgId();
    const { data: created, error } = await supabase.from("framework_mappings").insert({
      source_framework_id: selectedFramework,
      source_control_id: mappingForm.source_control_id,
      target_framework_id: mappingForm.target_framework_id,
      target_control_id: mappingForm.target_control_id,
      rationale: mappingForm.rationale || null,
      org_id: orgId,
    }).select("id").single();
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      await recordAudit({ entity_type: "framework_mappings", action: "insert", entity_id: created?.id || null, after: mappingForm });
      toast({ title: "Mapping created" });
      setMappingDialogOpen(false);
      setMappingForm({});
      fetchMappings(selectedFramework);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Creative background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-indigo-50 to-fuchsia-50" />
      <div className="absolute inset-0 -z-10 opacity-[0.06]" style={{backgroundImage:"radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)", backgroundSize:"24px 24px"}} />

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 p-6 backdrop-blur">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2"><GitBranch className="h-5 w-5 text-indigo-600" /> Frameworks & Crosswalks</h2>
            <p className="mt-1 text-slate-600">Manage frameworks and map controls across frameworks.</p>
          </div>
          {canEdit && (
            <Button onClick={() => setAddDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!!limits && !!counts && counts.frameworks >= limits.max_frameworks} title={limits && counts && counts.frameworks >= limits.max_frameworks ? 'Framework limit reached — upgrade in Settings' : undefined}>
              <Plus className="h-4 w-4 mr-2" />
              Add Framework
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Frameworks</CardTitle>
            </CardHeader>
            <CardContent>
              {limits && counts && counts.frameworks >= limits.max_frameworks && (
                <div className="mb-3 rounded border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm">
                  Framework limit reached for your plan. Visit Settings to upgrade.
                </div>
              )}
              <div className="space-y-2">
                {frameworks.length === 0 && (
                  <p className="text-sm text-slate-600">No frameworks yet.</p>
                )}
                {frameworks.map((f) => (
                  <button
                    key={f.id}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm ${selectedFramework===f.id?"bg-indigo-50 text-indigo-700 border border-indigo-200":"hover:bg-slate-50"}`}
                    onClick={() => setSelectedFramework(f.id)}
                  >
                    <div className="font-medium">{f.name}</div>
                    {f.description && <div className="text-xs text-slate-600">{f.description}</div>}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-slate-200/60 bg-white/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Controls</CardTitle>
                {selectedFramework && coveragePercent !== null && (
                  <Badge variant="secondary">Coverage: {coveragePercent}%</Badge>
                )}
              </div>
              {canEdit && selectedFramework && (
                <Button onClick={() => setMappingDialogOpen(true)} variant="secondary">Create Mapping</Button>
              )}
            </CardHeader>
            <CardContent>
              {!selectedFramework ? (
                <p className="text-sm text-slate-600">Select a framework to view controls.</p>
              ) : sourceControls.length === 0 ? (
                <p className="text-sm text-slate-600">No controls in this framework.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceControls.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.code}</TableCell>
                        <TableCell className="text-slate-700">{c.description}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${c.status==='compliant'?'bg-green-100 text-green-700':c.status==='partial'?'bg-amber-100 text-amber-700':'bg-rose-100 text-rose-700'}`}>{c.status}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Existing Mappings</h3>
                {targetCoverage.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {targetCoverage.map((t) => (
                      <Badge key={t.id} variant="secondary">{t.name}: {t.percent}%</Badge>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 mb-3">
                  <div>
                    <Label>Filter by target framework</Label>
                    <Select value={mapFilterTarget || undefined} onValueChange={(v)=>setMapFilterTarget(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        {frameworks.map((f)=> (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Filter by source control code</Label>
                    <Input placeholder="e.g., AC-2" value={mapFilterCode} onChange={(e)=>setMapFilterCode(e.target.value)} />
                  </div>
                </div>
                {mappings.length === 0 ? (
                  <p className="text-xs text-slate-600 mt-1">No mappings created for this framework.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source Control</TableHead>
                        <TableHead>Target Framework</TableHead>
                        <TableHead>Target Control</TableHead>
                        <TableHead>Rationale</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {mappings
                      .filter((m)=> !mapFilterTarget || m.target_framework_id === mapFilterTarget)
                      .filter((m)=> !mapFilterCode || (sourceControls.find((c)=>c.id===m.source_control_id)?.code || "").toLowerCase().includes(mapFilterCode.toLowerCase()))
                      .map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{sourceControls.find((c)=>c.id===m.source_control_id)?.code || m.source_control_id}</TableCell>
                        <TableCell>{frameworks.find((f)=>f.id===m.target_framework_id)?.name || m.target_framework_id}</TableCell>
                        <TableCell>{(controlsByFramework[m.target_framework_id]||[]).find((c)=>c.id===m.target_control_id)?.code || m.target_control_id}</TableCell>
                        <TableCell className="text-slate-700 text-sm">{m.rationale || "—"}</TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Framework dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Framework</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleAddFramework}>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={newFramework.name || ""} onChange={(e)=>setNewFramework({ ...newFramework, name: e.target.value })} placeholder="ISO 27001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input id="desc" value={newFramework.description || ""} onChange={(e)=>setNewFramework({ ...newFramework, description: e.target.value })} placeholder="Information Security Management" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={()=>setAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Mapping dialog */}
        <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Mapping</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateMapping}>
              <div className="space-y-2">
                <Label>Source Control</Label>
                <Select value={mappingForm.source_control_id || undefined} onValueChange={(v)=>setMappingForm({ ...mappingForm, source_control_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source control" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceControls.map((c)=> (
                      <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Framework</Label>
                <Select value={mappingForm.target_framework_id || undefined} onValueChange={(v)=>setMappingForm({ ...mappingForm, target_framework_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target framework" />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworks.filter(f=>f.id!==selectedFramework).map((f)=> (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Control</Label>
                <Select value={mappingForm.target_control_id || undefined} onValueChange={(v)=>setMappingForm({ ...mappingForm, target_control_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target control" />
                  </SelectTrigger>
                  <SelectContent>
                    {(mappingForm.target_framework_id ? controlsByFramework[mappingForm.target_framework_id] || [] : []).map((c)=> (
                      <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rationale">Rationale</Label>
                <Input id="rationale" value={mappingForm.rationale || ""} onChange={(e)=>setMappingForm({ ...mappingForm, rationale: e.target.value })} placeholder="Explain equivalence or coverage." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={()=>setMappingDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Frameworks;