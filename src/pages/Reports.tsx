import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Gauge, BarChart3, AlertTriangle, CheckCircle2, Clock, CalendarDays } from "lucide-react";
import JSZip from "jszip";
import { recordAudit } from "@/integrations/supabase/audit";
import { toast } from "@/hooks/use-toast";

const Reports = () => {
  const [riskStats, setRiskStats] = useState<any>({});
  const [complianceStats, setComplianceStats] = useState<any[]>([]);
  const [tasksStats, setTasksStats] = useState<{ open: number; done: number }>({ open: 0, done: 0 });
  const [exceptionsExpiring, setExceptionsExpiring] = useState<{ d30: number; d60: number; d90: number }>({ d30: 0, d60: 0, d90: 0 });
  const [effectiveRate, setEffectiveRate] = useState<number>(0);
  const [upcomingTests, setUpcomingTests] = useState<any[]>([]);
  const [exceptionsList, setExceptionsList] = useState<any[]>([]);
  const [exceptionsFilterDays, setExceptionsFilterDays] = useState<number | null>(null);

  useEffect(() => {
    fetchRiskStats();
    fetchComplianceStats();
  }, []);

  const fetchRiskStats = async () => {
    const orgId = await getRequiredOrgId();
    const { data: risks } = await supabase
      .from("risks")
      .select("status")
      .eq("org_id", orgId);

    if (risks) {
      const stats = {
        open: risks.filter((r) => r.status === "open").length,
        in_progress: risks.filter((r) => r.status === "in_progress").length,
        closed: risks.filter((r) => r.status === "closed").length,
        total: risks.length,
      };
      setRiskStats(stats);
    }
  };

  const fetchComplianceStats = async () => {
    const orgId = await getRequiredOrgId();
    const { data: frameworks } = await supabase
      .from("frameworks")
      .select("id, name")
      .eq("org_id", orgId);

    if (frameworks) {
      const stats = await Promise.all(
        frameworks.map(async (framework) => {
          const { data: controls } = await supabase
            .from("controls")
            .select("status")
            .eq("framework_id", framework.id)
            .eq("org_id", orgId);

          if (controls && controls.length > 0) {
            const compliantCount = controls.filter((c) => c.status === "compliant").length;
            const percentage = Math.round((compliantCount / controls.length) * 100);
            return {
              name: framework.name,
              percentage,
              compliant: compliantCount,
              total: controls.length,
            };
          }

          return {
            name: framework.name,
            percentage: 0,
            compliant: 0,
            total: 0,
          };
        })
      );

      setComplianceStats(stats);
    }
  };

  useEffect(() => {
    // Tasks open/done
    (async () => {
      const orgId = await getRequiredOrgId();
      const { data: tasks } = await supabase.from("tasks").select("status").eq("org_id", orgId);
      if (tasks) {
        const open = tasks.filter((t) => t.status === "open").length;
        const done = tasks.filter((t) => t.status === "done").length;
        setTasksStats({ open, done });
      }
    })();

    // Exceptions expiring next 90 days
    (async () => {
      const today = new Date();
      const maxDate = new Date();
      maxDate.setDate(today.getDate() + 90);
      const orgId = await getRequiredOrgId();
      const { data: exceptions } = await supabase
        .from("control_exceptions")
        .select("id, control_id, expires_at, approver")
        .not("expires_at", "is", null)
        .gte("expires_at", today.toISOString().slice(0, 10))
        .lte("expires_at", maxDate.toISOString().slice(0, 10))
        .eq("org_id", orgId);
      if (exceptions) {
        let d30 = 0, d60 = 0, d90 = 0;
        const enriched: any[] = [];
        for (const ex of exceptions as any[]) {
          const days = Math.ceil((new Date(ex.expires_at).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (days <= 30) d30 += 1; else if (days <= 60) d60 += 1; else d90 += 1;
          enriched.push({ id: ex.id, control_id: ex.control_id, expires_at: ex.expires_at, approver: ex.approver, days_left: days });
        }
        setExceptionsExpiring({ d30, d60, d90 });
        // Resolve control codes
        const ids = Array.from(new Set(enriched.map((e) => e.control_id))).filter(Boolean);
        if (ids.length > 0) {
          const { data: ctrls } = await supabase
            .from("controls")
            .select("id, code")
            .in("id", ids)
            .eq("org_id", orgId);
          const byId: Record<string, string> = {};
          for (const c of (ctrls || [])) byId[c.id] = c.code;
          setExceptionsList(enriched.map((e) => ({ ...e, code: byId[e.control_id] || e.control_id })));
        } else {
          setExceptionsList(enriched);
        }
      }
    })();

    // Controls effectiveness rate (latest test conclusion)
    (async () => {
      const orgId = await getRequiredOrgId();
      const { data: tests } = await supabase
        .from("control_tests")
        .select("conclusion, control_id, period_end")
        .order("period_end", { ascending: false })
        .eq("org_id", orgId);
      if (tests) {
        const latestByControl = new Map<string, any>();
        for (const t of tests) {
          if (!latestByControl.has(t.control_id)) latestByControl.set(t.control_id, t);
        }
        const latest = Array.from(latestByControl.values());
        const effective = latest.filter((t) => t.conclusion === "effective").length;
        setEffectiveRate(latest.length ? Math.round((effective / latest.length) * 100) : 0);
      }
    })();

    // Upcoming control tests based on frequency + last_tested_date
    (async () => {
      const orgId = await getRequiredOrgId();
      const { data: ctrls } = await supabase
        .from("controls")
        .select("id, code, frequency, last_tested_date")
        .eq("org_id", orgId);
      if (ctrls && ctrls.length > 0) {
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
        const upcoming = ctrls
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
          .slice(0, 6);
        setUpcomingTests(upcoming as any[]);
      }
    })();
  }, []);

  const exportRisksCSV = async () => {
    const orgId = await getRequiredOrgId();
    const { data: risks } = await supabase
      .from("risks")
      .select("*, profiles!risks_owner_fkey(full_name)")
      .eq("org_id", orgId);

    if (risks) {
      const csv = [
        ["Title", "Owner", "Likelihood", "Impact", "Score", "Status"].join(","),
        ...risks.map((r) =>
          [
            r.title,
            r.profiles?.full_name || "Unassigned",
            r.likelihood,
            r.impact,
            r.score,
            r.status,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "risks_export.csv";
      a.click();

      toast({
        title: "Success",
        description: "Risks exported successfully",
      });
    }
  };

  const exportComplianceCSV = () => {
    const csv = [
      ["Framework", "Compliant", "Total", "Percentage"].join(","),
      ...complianceStats.map((s) =>
        [s.name, s.compliant, s.total, `${s.percentage}%`].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance_export.csv";
    a.click();

    toast({
      title: "Success",
      description: "Compliance data exported successfully",
    });
  };

  const exportRCMCSV = async () => {
    const orgId = await getRequiredOrgId();
    const { data: ctrls } = await supabase
      .from("controls")
      .select("id, code, description, status, owner, frequency, type, last_tested_date")
      .eq("org_id", orgId);
    const { data: tests } = await supabase
      .from("control_tests")
      .select("control_id, conclusion, period_end")
      .order("period_end", { ascending: false })
      .eq("org_id", orgId);
    const latestByControl = new Map<string, any>();
    for (const t of (tests || [])) {
      if (!latestByControl.has(t.control_id)) latestByControl.set(t.control_id, t);
    }
    const csv = [
      [
        "Control Code",
        "Description",
        "Owner",
        "Frequency",
        "Type",
        "Status",
        "Last Tested",
        "Effectiveness",
      ].join(","),
      ...((ctrls || []).map((c) => [
        c.code,
        (c.description || "").replace(/\n/g, " "),
        c.owner || "",
        c.frequency || "",
        c.type || "",
        c.status,
        c.last_tested_date || "",
        latestByControl.get(c.id)?.conclusion || "design_only",
      ].join(","))),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rcm_export.csv";
    a.click();
    toast({ title: "RCM exported", description: "Control register downloaded" });
  };

  const exportPBCCSV = async () => {
    // Use open tasks related to controls as PBC list
    const orgId = await getRequiredOrgId();
    const { data: tasks } = await supabase
      .from("tasks")
      .select("title, assigned_to, related_type, related_id, due_date, status")
      .eq("related_type", "control")
      .eq("status", "open")
      .eq("org_id", orgId);
    const csv = [
      ["Title", "Assigned To", "Control", "Due Date", "Status"].join(","),
      ...((tasks || []).map((t) => [
        t.title,
        t.assigned_to || "",
        t.related_id,
        t.due_date || "",
        t.status,
      ].join(","))),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pbc_export.csv";
    a.click();
    toast({ title: "PBC exported", description: "Open evidence requests downloaded" });
  };

  const exportBundleZIP = async () => {
    try {
      const orgId = await getRequiredOrgId();
      const { data: auth } = await supabase.auth.getUser();
      const actor = auth?.user?.id || null;
      // Rate-limit check via RPC
      const { data: rate } = await supabase.rpc("check_export_rate", { org_id: orgId, actor, category: "reports_bundle" });
      const allowed = (rate as any)?.allowed !== false;
      if (!allowed) {
        const retry = (rate as any)?.retry_after_ms || 60000;
        toast({ variant: "destructive", title: "Rate limited", description: `Try again in ${Math.ceil(retry/1000)}s` });
        await recordAudit({ entity_type: "reports_export", entity_id: orgId, action: "rate_limited", after_data: rate });
        return;
      }
      const zip = new JSZip();

      // Risks CSV
      const { data: risks } = await supabase
        .from("risks")
        .select("*, profiles!risks_owner_fkey(full_name)")
        .eq("org_id", orgId);
      const risksCsv = [
        ["Title", "Owner", "Likelihood", "Impact", "Score", "Status"].join(","),
        ...((risks || []).map((r: any) => [
          r.title,
          r.profiles?.full_name || "Unassigned",
          r.likelihood ?? "",
          r.impact ?? "",
          r.score ?? "",
          r.status ?? "",
        ].join(","))),
      ].join("\n");
      zip.file("risks_export.csv", risksCsv);

      // Compliance CSV (from state)
      const complianceCsv = [
        ["Framework", "Compliant", "Total", "Percentage"].join(","),
        ...complianceStats.map((s) => [s.name, s.compliant, s.total, `${s.percentage}%`].join(",")),
      ].join("\n");
      zip.file("compliance_export.csv", complianceCsv);

      // RCM CSV
      const { data: ctrls } = await supabase
        .from("controls")
        .select("id, code, description, status, owner, frequency, type, last_tested_date")
        .eq("org_id", orgId);
      const { data: tests } = await supabase
        .from("control_tests")
        .select("control_id, conclusion, period_end")
        .order("period_end", { ascending: false })
        .eq("org_id", orgId);
      const latestByControl = new Map<string, any>();
      for (const t of (tests || [])) {
        if (!latestByControl.has(t.control_id)) latestByControl.set(t.control_id, t);
      }
      const rcmCsv = [
        [
          "Control Code",
          "Description",
          "Owner",
          "Frequency",
          "Type",
          "Status",
          "Last Tested",
          "Effectiveness",
        ].join(","),
        ...((ctrls || []).map((c: any) => [
          c.code,
          (c.description || "").replace(/\n/g, " "),
          c.owner || "",
          c.frequency || "",
          c.type || "",
          c.status ?? "",
          c.last_tested_date || "",
          latestByControl.get(c.id)?.conclusion || "design_only",
        ].join(","))),
      ].join("\n");
      zip.file("rcm_export.csv", rcmCsv);

      // PBC CSV (open control tasks)
      const { data: tasks } = await supabase
        .from("tasks")
        .select("title, assigned_to, related_type, related_id, due_date, status")
        .eq("related_type", "control")
        .eq("status", "open")
        .eq("org_id", orgId);
      const pbcCsv = [
        ["Title", "Assigned To", "Control", "Due Date", "Status"].join(","),
        ...((tasks || []).map((t: any) => [
          t.title,
          t.assigned_to || "",
          t.related_id,
          t.due_date || "",
          t.status,
        ].join(","))),
      ].join("\n");
      zip.file("pbc_export.csv", pbcCsv);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grc_guard_report_bundle_${new Date().toISOString().slice(0,10)}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Bundle exported", description: "ZIP with CSV reports downloaded" });
      // Log event and audit (best-effort; do not fail export if logging fails)
      try {
        await supabase.from("rate_limit_events").insert({ org_id: orgId, actor, category: "reports_bundle" });
      } catch (e) {
        console.warn("rate_limit_events insert failed", e);
      }
      try {
        await recordAudit({ entity_type: "reports_export", entity_id: orgId, action: "export_bundle", after_data: { category: "reports_bundle" } });
      } catch (e) {
        console.warn("audit export log failed", e);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export failed", description: err?.message || "Failed to generate ZIP" });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Creative backdrop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-violet-50 to-sky-50" />
      <div className="absolute inset-0 -z-10 opacity-[0.06]" style={{backgroundImage:"radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)", backgroundSize:"24px 24px"}} />

      <div className="space-y-6 mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 p-6 backdrop-blur">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-600" /> Reports & Analytics</h2>
            <p className="text-slate-600">Visualize risk posture, compliance, and operational workload.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportRCMCSV}><Download className="h-4 w-4 mr-2" /> Export RCM</Button>
            <Button variant="secondary" onClick={exportPBCCSV}><Download className="h-4 w-4 mr-2" /> Export PBC</Button>
            <Button variant="secondary" onClick={exportBundleZIP}><Download className="h-4 w-4 mr-2" /> Export Bundle (ZIP)</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Open Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{riskStats.open || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">In Progress Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{riskStats.in_progress || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Closed Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{riskStats.closed || 0}</div>
          </CardContent>
        </Card>
        </div>

        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Risks by Status</CardTitle>
          <Button onClick={exportRisksCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Risks</span>
              <span className="text-2xl font-bold">{riskStats.total || 0}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Open</span>
                <span className="font-medium">{riskStats.open || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>In Progress</span>
                <span className="font-medium">{riskStats.in_progress || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Closed</span>
                <span className="font-medium">{riskStats.closed || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
        </Card>

        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Compliance by Framework</CardTitle>
          <Button onClick={exportComplianceCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {complianceStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No compliance data available</p>
          ) : (
            <div className="space-y-4">
              {complianceStats.map((stat, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stat.name}</span>
                    <span className="font-bold">{stat.percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.compliant} of {stat.total} controls compliant
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>

        {/* Workload and posture cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-indigo-600" /> Tasks Workload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Open</span>
                  <span className="font-semibold">{tasksStats.open}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Done</span>
                  <span className="font-semibold">{tasksStats.done}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.round((tasksStats.open / Math.max(1, tasksStats.open + tasksStats.done)) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">Open tasks proportion</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Exceptions Expiring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700 hover:bg-amber-200" onClick={() => setExceptionsFilterDays(30)}>30d: {exceptionsExpiring.d30}</button>
                <button className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-200" onClick={() => setExceptionsFilterDays(60)}>60d: {exceptionsExpiring.d60}</button>
                <button className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs text-sky-700 hover:bg-sky-200" onClick={() => setExceptionsFilterDays(90)}>90d: {exceptionsExpiring.d90}</button>
                {exceptionsFilterDays !== null && (
                  <button className="ml-auto text-xs underline text-slate-600" onClick={() => setExceptionsFilterDays(null)}>Clear</button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Controls Effectiveness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20">
                  <div className="absolute inset-0 rounded-full" style={{background:`conic-gradient(#22c55e ${effectiveRate*3.6}deg, #e2e8f0 0deg)`}} />
                  <div className="absolute inset-2 rounded-full bg-slate-900" />
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">{effectiveRate}%</div>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Latest tests marked effective</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming tests due */}
          <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-sky-600" /> Upcoming Tests</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTests.length === 0 ? (
                <p className="text-xs text-muted-foreground">No upcoming tests found</p>
              ) : (
                <div className="space-y-2">
                  {upcomingTests.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1 text-xs">
                      <div>
                        <span className="font-medium">{t.code}</span>
                        <span className="ml-2 text-muted-foreground">Due {t.due_date}</span>
                      </div>
                      <span className={t.days_left < 0 ? "text-red-600" : t.days_left <= 7 ? "text-amber-600" : "text-emerald-600"}>
                        {t.days_left < 0 ? `Overdue ${Math.abs(t.days_left)}d` : `${t.days_left}d left`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Exceptions table */}
        <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Exceptions Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            {exceptionsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expiring exceptions.</p>
            ) : (
              <div className="space-y-2">
                {exceptionsList
                  .filter((e) => exceptionsFilterDays === null || e.days_left <= exceptionsFilterDays)
                  .sort((a, b) => a.days_left - b.days_left)
                  .slice(0, 10)
                  .map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{e.code || e.control_id}</div>
                        <div className="text-xs text-muted-foreground">Expires {e.expires_at}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={e.days_left < 0 ? "text-red-600" : e.days_left <= 7 ? "text-amber-600" : "text-emerald-600"}>
                          {e.days_left < 0 ? `Overdue ${Math.abs(e.days_left)}d` : `${e.days_left}d left`}
                        </span>
                        {e.approver && <span className="text-xs text-slate-600">Approved by {e.approver}</span>}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
