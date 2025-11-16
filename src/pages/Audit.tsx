import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Download } from "lucide-react";

const Audit = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    (async () => {
      const orgId = await getRequiredOrgId();
      const { data } = await supabase
        .from("audit_logs")
        .select("id, actor_email, entity_type, entity_id, action, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(500);
      setLogs(data || []);
    })();
  }, []);

  const filtered = useMemo(() => {
    return (logs || []).filter((l) => {
      if (entityFilter && !String(l.entity_type || "").toLowerCase().includes(entityFilter.toLowerCase())) return false;
      if (actionFilter && !String(l.action || "").toLowerCase().includes(actionFilter.toLowerCase())) return false;
      if (actorFilter && !String(l.actor_email || "").toLowerCase().includes(actorFilter.toLowerCase())) return false;
      if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(l.created_at) > new Date(dateTo)) return false;
      return true;
    });
  }, [logs, entityFilter, actionFilter, actorFilter, dateFrom, dateTo]);

  const exportCSV = () => {
    const csv = [
      ["Actor", "Entity", "ID", "Action", "At"].join(","),
      ...filtered.map((l) => [l.actor_email || "", l.entity_type, l.entity_id || "", l.action, l.created_at].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_logs.csv";
    a.click();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <Button variant="secondary" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input placeholder="Entity (e.g., policies)" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} />
            <Input placeholder="Action (insert/update/delete)" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
            <Input placeholder="Actor email" value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actor</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.actor_email || ""}</TableCell>
                <TableCell>{l.entity_type}</TableCell>
                <TableCell>{l.entity_id || ""}</TableCell>
                <TableCell>{l.action}</TableCell>
                <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">No logs match filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Audit;