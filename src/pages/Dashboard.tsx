import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, Plus, Database, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentOrg } from "@/context/CurrentOrgProvider";
import { toast } from "@/hooks/use-toast";
import { recordAudit } from "@/integrations/supabase/audit";

interface DashboardStats {
  totalRisks: number;
  highRisks: number;
  compliancePercent: number;
  openTasks: number;
  dueForReview: number;
  overdueTasks: number;
  plansDue: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { org: currentOrg } = useCurrentOrg();
  const [userRole, setUserRole] = useState<string>("viewer");
  const [stats, setStats] = useState<DashboardStats>({
    totalRisks: 0,
    highRisks: 0,
    compliancePercent: 0,
    openTasks: 0,
    dueForReview: 0,
    overdueTasks: 0,
    plansDue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [risksList, setRisksList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [frameworkCompliance, setFrameworkCompliance] = useState<any[]>([]);
  const [riskTrend, setRiskTrend] = useState<number[]>([]);
  const [closedTrend, setClosedTrend] = useState<number[]>([]);
  const [plansTrend, setPlansTrend] = useState<number[]>([]);
  const [plansLabels, setPlansLabels] = useState<string[]>([]);
  const [exceptionsExpiring, setExceptionsExpiring] = useState<{ d30: number; d60: number; d90: number }>({ d30: 0, d60: 0, d90: 0 });

  useEffect(() => {
    fetchDashboardData();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role) setUserRole(profile.role);
    }
  };

  const fetchDashboardData = async () => {
    const orgId = await getRequiredOrgId();
    const { data: org } = await supabase
      .from("organizations")
      .select("risk_appetite_threshold, disabled_framework_ids")
      .eq("id", orgId)
      .single();
    const appetite = (org?.risk_appetite_threshold ?? 12) as number;
    // Fetch risks
    const { data: risks } = await supabase
      .from("risks")
      .select("*")
      .eq("org_id", orgId);

    // Fetch tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("org_id", orgId);

    // Fetch controls for compliance
    const { data: controls } = await supabase
      .from("controls")
      .select("*")
      .eq("org_id", orgId);
    const { data: frameworks } = await supabase
      .from("frameworks")
      .select("id, name")
      .eq("org_id", orgId);
    const { data: mappings } = await supabase
      .from("framework_mappings")
      .select("id, source_control_id, target_framework_id, target_control_id")
      .eq("org_id", orgId);
    // Fetch treatment plans
    const { data: plans } = await supabase
      .from("treatment_plans")
      .select("*")
      .eq("org_id", orgId);

    // Exceptions expiring chips (30/60/90 days)
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 90);
    const todayStr = today.toISOString().slice(0, 10);
    const maxStr = maxDate.toISOString().slice(0, 10);
    const { data: exceptions } = await supabase
      .from("control_exceptions")
      .select("id, expires_at")
      .not("expires_at", "is", null)
      .gte("expires_at", todayStr)
      .lte("expires_at", maxStr)
      .eq("org_id", orgId);
    if (exceptions) {
      let d30 = 0, d60 = 0, d90 = 0;
      for (const ex of exceptions) {
        const days = Math.ceil((new Date(ex.expires_at).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 30) d30 += 1; else if (days <= 60) d60 += 1; else d90 += 1;
      }
      setExceptionsExpiring({ d30, d60, d90 });
    }

    if (risks) {
      setRisksList(risks);
      const highRisks = risks.filter((r) => r.status === "open" && (r.score ?? 0) >= appetite);
      const today = new Date();
      today.setHours(0,0,0,0);
      const dueReview = risks.filter((r) => r.status !== "closed" && r.next_review_date && new Date(r.next_review_date) < today).length;
      setStats((prev) => ({
        ...prev,
        totalRisks: risks.length,
        highRisks: highRisks.length,
        dueForReview: dueReview,
      }));
    }

    if (tasks) {
      setTasksList(tasks);
      const openTaskCount = tasks.filter((t:any) => t.status === "open").length;
      const today = new Date();
      today.setHours(0,0,0,0);
      const overdueCount = tasks.filter((t:any) => t.status !== "done" && t.due_date && new Date(t.due_date) < today).length;
      setStats((prev) => ({
        ...prev,
        openTasks: openTaskCount,
        overdueTasks: overdueCount,
      }));
    }

    // Plans due
    if (plans) {
      const today2 = new Date();
      today2.setHours(0,0,0,0);
      const plansDueCount = plans.filter((p:any) => p.status !== "done" && p.due_date && new Date(p.due_date) < today2).length;
      setStats((prev) => ({ ...prev, plansDue: plansDueCount }));
    }

    if (controls && controls.length > 0) {
      const compliantCount = controls.filter((c) => c.status === "compliant").length;
      const compliancePercent = Math.round((compliantCount / controls.length) * 100);
      setStats((prev) => ({
        ...prev,
        compliancePercent,
      }));

      // Compliance per framework
      let fwList = frameworks || [];
      if (org?.disabled_framework_ids && (org.disabled_framework_ids as any[]).length > 0) {
        const disabled = new Set(org.disabled_framework_ids as string[]);
        fwList = fwList.filter((f:any) => !disabled.has(f.id));
      }
      if (fwList && fwList.length > 0) {
        const direct: Record<string, { name: string; total: number; compliant: number; percent: number }> = {};
        for (const fw of fwList) {
          direct[fw.id] = { name: fw.name, total: 0, compliant: 0, percent: 0 };
        }
        for (const c of controls) {
          const k = c.framework_id as string;
          if (direct[k]) {
            direct[k].total += 1;
            if (c.status === "compliant") direct[k].compliant += 1;
          }
        }
        for (const id of Object.keys(direct)) {
          const x = direct[id];
          x.percent = x.total ? Math.round((x.compliant / x.total) * 100) : 0;
        }

        const byTarget: Record<string, { name: string; total: number; compliant: number; percent: number }> = {};
        const controlStatus: Record<string, string> = {};
        for (const c of controls) controlStatus[c.id as string] = c.status as string;
        if (mappings && mappings.length > 0) {
          for (const fw of fwList) {
            byTarget[fw.id] = { name: fw.name, total: 0, compliant: 0, percent: 0 };
          }
          const covered: Record<string, Record<string, boolean>> = {};
          for (const m of mappings) {
            const tgtFw = m.target_framework_id as string;
            const tgtCtrl = m.target_control_id as string;
            const srcStatus = controlStatus[m.source_control_id as string] || "";
            if (!byTarget[tgtFw]) continue;
            if (!covered[tgtFw]) covered[tgtFw] = {};
            if (!covered[tgtFw][tgtCtrl]) {
              covered[tgtFw][tgtCtrl] = false;
              byTarget[tgtFw].total += 1;
            }
            if (srcStatus === "compliant" && covered[tgtFw][tgtCtrl] === false) {
              covered[tgtFw][tgtCtrl] = true;
              byTarget[tgtFw].compliant += 1;
            }
          }
          for (const id of Object.keys(byTarget)) {
            const x = byTarget[id];
            x.percent = x.total ? Math.round((x.compliant / x.total) * 100) : 0;
          }
        }

        const final = Object.keys(direct).map((id) => {
          const d = direct[id];
          const t = byTarget[id];
          return { name: d.name, total: d.total, compliant: d.compliant, percent: t && t.total > 0 ? t.percent : d.percent };
        });
        setFrameworkCompliance(final);
      }
    }

    // Fetch recent activity (last 5 risks)
    const { data: recentRisks } = await supabase
      .from("risks")
      .select("*, profiles!risks_owner_fkey(full_name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentRisks) {
      setRecentActivity(recentRisks);
    }

    // Risks trend: last 30 days (new risks)
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const counts = days.map((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      let c = 0;
      for (const r of risks || []) {
        if (!r.created_at) continue;
        const t = new Date(r.created_at);
        if (t >= d && t < next) c += 1;
      }
      return c;
    });
    setRiskTrend(counts);
    const closedCounts = days.map((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      let c = 0;
      for (const r of risks || []) {
        const tStr = (r as any).closure_date || null;
        if (!tStr) continue;
        const t = new Date(tStr);
        if (t >= d && t < next) c += 1;
      }
      return c;
    });
    setClosedTrend(closedCounts);

    // Treatment plans completed trend (last 12 months)
    const months: Date[] = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i), 1);
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const donePlans = (plans || []).filter((p: any) => p.status === "done");
    const monthCounts = months.map((m) => {
      const next = new Date(m);
      next.setMonth(m.getMonth() + 1, 1);
      let c = 0;
      for (const p of donePlans) {
        const tStr = p.due_date || p.created_at;
        if (!tStr) continue;
        const t = new Date(tStr);
        if (t >= m && t < next) c += 1;
      }
      return c;
    });
    setPlansTrend(monthCounts);
    const labelFmt = new Intl.DateTimeFormat(undefined, { month: "short" });
    setPlansLabels(months.map((m) => labelFmt.format(m)));
  };

  const seedDemoData = async () => {
    // Only allow admin
    if (userRole !== "admin") {
      toast({ variant: "destructive", title: "Forbidden", description: "Only admin can seed demo data" });
      return;
    }

    const orgId = await getRequiredOrgId();

    // Seed frameworks
    const frameworks = [
      { name: "ISO 27001", description: "Information Security Management" },
      { name: "SOC 2", description: "Service Organization Controls" },
    ];
    for (const fw of frameworks) {
      const { data: existing } = await supabase
        .from("frameworks")
        .select("id")
        .eq("name", fw.name)
        .eq("org_id", orgId)
        .limit(1);
      if (!existing || existing.length === 0) {
        const { data: ins } = await supabase
          .from("frameworks")
          .insert({ ...fw, org_id: orgId })
          .select("id")
          .single();
        await recordAudit({ entity_type: "frameworks", action: "insert", entity_id: ins?.id || null, after: fw });
      }
    }

    // Map control seeds to framework by name
    const { data: fwAll } = await supabase.from("frameworks").select("id, name").eq("org_id", orgId);
    const getFwId = (name: string) => fwAll?.find((f) => f.name === name)?.id || null;

    const controls = [
      { framework: "ISO 27001", code: "A.5.1", description: "Information security policies", status: "partial" },
      { framework: "ISO 27001", code: "A.12.6", description: "Technical vulnerability management", status: "not_compliant" },
      { framework: "SOC 2", code: "CC1.1", description: "Control environment", status: "compliant" },
    ];
    for (const c of controls) {
      const framework_id = getFwId(c.framework);
      if (!framework_id) continue;
      const { data: existing } = await supabase
        .from("controls")
        .select("id")
        .eq("framework_id", framework_id)
        .eq("code", c.code)
        .eq("org_id", orgId)
        .limit(1);
      if (!existing || existing.length === 0) {
        const { data: ins } = await supabase
          .from("controls")
          .insert({
            framework_id,
            code: c.code,
            description: c.description,
            status: c.status,
            org_id: orgId,
          })
          .select("id")
          .single();
        await recordAudit({ entity_type: "controls", action: "insert", entity_id: ins?.id || null, after: c });
      }
    }

    // Seed risks
    const risks = [
      { title: "Ransomware Attack", description: "Potential ransomware infection across endpoints", likelihood: 4, impact: 4, status: "open" },
      { title: "Data Loss in Cloud", description: "Misconfiguration causing data exposure", likelihood: 3, impact: 5, status: "in_progress" },
    ];
    for (const r of risks) {
      const { data: existing } = await supabase
        .from("risks")
        .select("id")
        .eq("title", r.title)
        .eq("org_id", orgId)
        .limit(1);
      if (!existing || existing.length === 0) {
        const { data: ins } = await supabase
          .from("risks")
          .insert({ ...(r as any), org_id: orgId })
          .select("id")
          .single();
        await recordAudit({ entity_type: "risks", action: "insert", entity_id: ins?.id || null, after: r });
      }
    }

    toast({ title: "Demo data seeded", description: "Frameworks, controls, and risks added" });
    fetchDashboardData();
  };

  const statCards = [
    {
      title: "Total Risks",
      value: stats.totalRisks,
      icon: AlertTriangle,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "High / Open Risks",
      value: stats.highRisks,
      icon: TrendingUp,
      color: "text-red-600",
      bgColor: "bg-red-100",
      onClick: () => navigate("/risks?filter=above_appetite"),
    },
    {
      title: "Above Appetite",
      value: stats.highRisks,
      icon: Flame,
      color: "text-red-700",
      bgColor: "bg-red-100",
      onClick: () => navigate("/risks?filter=above_appetite"),
    },
    {
      title: "Compliance",
      value: `${stats.compliancePercent}%`,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Open Tasks",
      value: stats.openTasks,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Overdue Tasks",
      value: stats.overdueTasks,
      icon: AlertTriangle,
      color: "text-amber-700",
      bgColor: "bg-amber-100",
      onClick: () => navigate("/tasks?filter=overdue"),
    },
    {
      title: "Plans Due",
      value: stats.plansDue,
      icon: Clock,
      color: "text-indigo-700",
      bgColor: "bg-indigo-100",
      onClick: () => navigate("/risks?filter=plans_due"),
    },
    {
      title: "Risks Due for Review",
      value: stats.dueForReview,
      icon: Clock,
      color: "text-rose-600",
      bgColor: "bg-rose-100",
    },
  ];

  // Derived chart data
  const riskStatusCounts = {
    open: risksList.filter((r:any) => r.status === "open").length,
    in_progress: risksList.filter((r:any) => r.status === "in_progress").length,
    closed: risksList.filter((r:any) => r.status === "closed").length,
  };
  const totalRiskCount = Math.max(
    riskStatusCounts.open + riskStatusCounts.in_progress + riskStatusCounts.closed,
    0
  );
  const openDeg = totalRiskCount ? (riskStatusCounts.open / totalRiskCount) * 360 : 0;
  const inProgDeg = totalRiskCount ? (riskStatusCounts.in_progress / totalRiskCount) * 360 : 0;
  const start2 = openDeg;
  const start3 = openDeg + inProgDeg;
  const donutStyle = totalRiskCount
    ? { background: `conic-gradient(#ef4444 0deg ${openDeg}deg, #f59e0b ${start2}deg ${start3}deg, #22c55e ${start3}deg 360deg)` }
    : { background: `conic-gradient(#334155 0deg 360deg)` };

  // Likelihood–Impact heatmap (5x5)
  const heatmap = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (const r of risksList) {
    const l = Math.min(Math.max(r.likelihood ?? 0, 1), 5);
    const i = Math.min(Math.max(r.impact ?? 0, 1), 5);
    if (l && i) heatmap[l - 1][i - 1] += 1;
  }
  const heatMax = Math.max(1, ...heatmap.flat());
  const cellColor = (v:number) => `rgba(99,102,241,${v / heatMax || 0})`; // indigo with alpha

  // Tasks status bar
  const taskOpen = tasksList.filter((t:any) => t.status === "open").length;
  const taskDone = tasksList.filter((t:any) => t.status === "done").length;
  const taskTotal = Math.max(taskOpen + taskDone, 1);
  const taskOpenPct = Math.round((taskOpen / taskTotal) * 100);

  // Risk trend path (simple line)
  const trendMax = Math.max(1, ...riskTrend);
  const chartW = 700;
  const chartH = 180;
  const trendPath = riskTrend
    .map((v, i) => {
      const x = (i / Math.max(1, riskTrend.length - 1)) * chartW;
      const y = chartH - (v / trendMax) * chartH;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const closedMax = Math.max(1, ...closedTrend);
  const closedPath = closedTrend
    .map((v, i) => {
      const x = (i / Math.max(1, closedTrend.length - 1)) * chartW;
      const y = chartH - (v / closedMax) * chartH;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Plans area/line path
  const plansMax = Math.max(1, ...plansTrend);
  const plansLine = plansTrend
    .map((v, i) => {
      const x = (i / Math.max(1, plansTrend.length - 1)) * chartW;
      const y = chartH - (v / plansMax) * chartH;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const plansArea = `M 0 ${chartH} ${plansLine} L ${chartW} ${chartH} Z`;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Light modern background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-violet-50 to-slate-100" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-400/20 via-fuchsia-400/10 to-teal-400/10 blur-3xl" />
      <div className="absolute inset-0 -z-10 opacity-[0.07]" style={{backgroundImage:"radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)", backgroundSize:"22px 22px"}} />

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-8">
        {/* Hero header */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-slate-200/60 bg-white/80 p-6 backdrop-blur md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{currentOrg?.name || "Your Organization"}</h2>
            <p className="mt-1 text-slate-600">Key risk, compliance, and task indicators.</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Compliance ring */}
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full" style={{background:`conic-gradient(#22c55e ${stats.compliancePercent*3.6}deg, #e2e8f0 0deg)`}} />
              <div className="absolute inset-2 rounded-full bg-slate-900" />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
                {stats.compliancePercent}%
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600">Compliance</p>
              <p className="text-sm font-medium text-slate-900">Current posture</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(userRole === "admin" || userRole === "manager") && (
              <Button onClick={() => navigate("/risks")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Risk
              </Button>
            )}
            {userRole === "admin" && (
              <Button variant="secondary" onClick={seedDemoData} className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50">
                <Database className="h-4 w-4 mr-2" />
                Seed Demo Data
              </Button>
            )}
          </div>
        </div>

        {/* Stats grid — appears first after hero */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card
              key={card.title}
              className={`border-white/10 bg-white/90 backdrop-blur-sm ${card.onClick ? "cursor-pointer" : ""}`}
              onClick={card.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`${card.bgColor} ${card.color} p-2 rounded-lg`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Compliance by Framework */}
        <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Compliance by Framework</CardTitle>
          </CardHeader>
          <CardContent>
            {frameworkCompliance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No frameworks found.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {frameworkCompliance.map((fw:any) => (
                  <div key={fw.name} className="flex items-center justify-between rounded border p-3">
                    <div className="font-medium">{fw.name}</div>
                    <div className="text-sm text-slate-700">{fw.percent}%</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exceptions expiring chips */}
        <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Exceptions Expiring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-700">Next 30/60/90 days:</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">30d: {exceptionsExpiring.d30}</span>
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs text-indigo-700">60d: {exceptionsExpiring.d60}</span>
                <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs text-sky-700">90d: {exceptionsExpiring.d90}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Full-width Risks Line Chart */}
        <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Risks Trend (last 30 days)</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate("/risks?filter=new_last_30")}>View New</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("/risks?filter=closed_last_30")}>View Closed</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <svg viewBox="0 0 700 180" className="w-full h-40">
                <g stroke="#e5e7eb" strokeWidth="1">
                  <line x1="0" y1="180" x2="700" y2="180" />
                  <line x1="0" y1="120" x2="700" y2="120" />
                  <line x1="0" y1="60" x2="700" y2="60" />
                </g>
                <path d={trendPath} fill="none" stroke="#6366f1" strokeWidth={2} />
                <path d={closedPath} fill="none" stroke="#ef4444" strokeWidth={2} />
                <text x="8" y="16" className="text-xs" fill="#6366f1">New</text>
                <text x="50" y="16" className="text-xs" fill="#ef4444">Closed</text>
              </svg>
              <p className="mt-2 text-xs text-muted-foreground">Daily count of risks created or updated.</p>
            </div>
          </CardContent>
        </Card>

        {/* Charts – creative layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Risk Heatmap (wide) */}
          <Card className="border-white/10 bg-white/90 backdrop-blur-sm lg:col-span-7">
            <CardHeader>
              <CardTitle>Risk Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-1">
                {heatmap.map((row, rIdx) => (
                  <div key={rIdx} className="contents">
                    {row.map((val, cIdx) => (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className="h-10 rounded"
                        style={{ backgroundColor: cellColor(val) }}
                        title={`L${rIdx + 1} x I${cIdx + 1}: ${val}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Intensity indicates count at each likelihood × impact cell.</p>
            </CardContent>
          </Card>

          {/* Risk Status Donut (tall side) */}
          <Card className="border-white/10 bg-white/90 backdrop-blur-sm lg:col-span-5">
            <CardHeader>
              <CardTitle>Risk Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative h-32 w-32">
                  <div className="absolute inset-0 rounded-full" style={donutStyle} />
                  <div className="absolute inset-4 rounded-full bg-slate-100" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-red-500" /> Open: {riskStatusCounts.open}</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-amber-500" /> In progress: {riskStatusCounts.in_progress}</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-green-500" /> Closed: {riskStatusCounts.closed}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* More charts – 3-up */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Compliance by framework bars */}
          <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Compliance by Framework</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {frameworkCompliance.length === 0 ? (
                  <p className="text-muted-foreground">No frameworks or controls yet.</p>
                ) : (
                  frameworkCompliance.map((fw) => (
                    <div key={fw.name}>
                      <div className="flex justify-between text-sm text-slate-700">
                        <span>{fw.name}</span>
                        <span>{fw.percent}%</span>
                      </div>
                      <div className="h-2 w-full rounded bg-slate-200 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${fw.percent}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Spacer card for future chart */}
          <Card className="border-slate-200/60 bg-white/80 backdrop-blur">
          <CardHeader>
              <CardTitle>Progress Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-40">
                  <defs>
                    <linearGradient id="plansFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={plansArea} fill="url(#plansFill)" />
                  <path d={plansLine} fill="none" stroke="#6366f1" strokeWidth={2} />
                </svg>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  {plansLabels.map((l, i) => (
                    <span key={i}>{l}</span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Completed treatment plans per month (due date or created date).</p>
              </div>
            </CardContent>
          </Card>

          {/* Tasks status bar */}
          <Card className="border-white/10 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Tasks Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-6 w-full rounded bg-slate-200 overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${taskOpenPct}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Open: {taskOpen}</span>
                  <span className="text-muted-foreground">Done: {taskDone}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        

        {/* Recent activity */}
        <Card className="border-white/10 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Owner: {item.profiles?.full_name || "Unassigned"} • Score: {item.score || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          item.status === "open"
                            ? "bg-red-100 text-red-700"
                            : item.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
