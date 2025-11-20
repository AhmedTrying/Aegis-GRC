import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskDialog } from "@/components/RiskDialog";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgUsage } from "@/hooks/useOrgUsage";
import { AlertTriangle, Plus, Search, TrendingUp, BarChart3, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { RiskDetail } from "@/components/RiskDetail";
import type { Tables } from "@/integrations/supabase/types";

interface Risk {
  id: string;
  title: string;
  description: string;
  category: string;
  department: string;
  inherent_likelihood: number;
  inherent_impact: number;
  residual_likelihood: number;
  residual_impact: number;
  status: string;
  owner: string;
  delegate_owner: string;
  next_review_date: string;
  created_at: string;
  org_id: string;
  likelihood?: number;
  impact?: number;
  score?: number;
  updated_at?: string | null;
  acceptance_status?: string | null;
  acceptance_expiry?: string | null;
  affected_asset?: string | null;
  cause?: string | null;
  consequence?: string | null;
  profiles?: { full_name?: string | null } | null;
}

interface TreatmentPlan {
  id: string;
  risk_id: string;
  action_type: string;
  description: string;
  status: string;
  progress: number;
  due_date: string | null;
  org_id: string;
}

 


const Risks = () => {
  console.log("Risks component rendering...");
  
  // Add error boundary state
  const [hasError, setHasError] = useState(false);
  const [componentError, setComponentError] = useState<Error | null>(null);
  
  const { role } = useUserRole();
  const canEdit = role === "admin" || role === "manager";
  const { limits, counts } = useOrgUsage();

  const [risks, setRisks] = useState<Risk[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const [loadingTreatmentPlans, setLoadingTreatmentPlans] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [treatmentPlans, setTreatmentPlans] = useState<Record<string, TreatmentPlan[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [delegateFilter, setDelegateFilter] = useState<string>("all");
  const [acceptanceFilter, setAcceptanceFilter] = useState<string>("all");
  const [scoreBucket, setScoreBucket] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [profilesList, setProfilesList] = useState<{ id: string; full_name: string | null }[]>([]);
  const [kpiTotal, setKpiTotal] = useState<number>(0);
  const [kpiOpenHigh, setKpiOpenHigh] = useState<number>(0);
  const [kpiOverdue, setKpiOverdue] = useState<number>(0);
  const [kpiAccepted, setKpiAccepted] = useState<number>(0);

  useEffect(() => {
    console.log("Risks component useEffect triggered");
    
    const loadData = async () => {
      try {
        console.log("Starting to load risks data...");
        setLoading(true);
        setLoadError(null);
        setRenderError(null);
        await fetchProfiles();
        await fetchRisks();
        await fetchKPIs();
        console.log("Risks data loaded successfully");
      } catch (e: any) {
        console.error("Failed to load risks data:", e);
        setLoadError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const fetchRisks = async () => {
    try {
      console.log("Fetching risks...");
      const orgId = await getRequiredOrgId();
      console.log("Organization ID resolved for risks:", orgId);
      
      if (!orgId) {
        console.error("No organization ID found for risks");
        toast({ variant: "destructive", title: "Error", description: "No organization found" });
        setRisks([]);
        return;
      }

      console.log("Querying risks from Supabase...");
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      const { data: risksData, error: risksError, count } = await supabase
        .from("risks")
        .select("*", { count: "exact" })
        .eq("org_id", orgId)
        .order(sortBy, { ascending: sortDir === "asc" })
        .range(start, end);
      
      console.log("Risks query result:", { risksData: risksData?.length, risksError });
      
      if (risksError) {
        console.error("Error fetching risks:", risksError);
        toast({ 
          variant: "destructive", 
          title: "Database Error", 
          description: `Failed to fetch risks: ${risksError.message}. Please contact support if this persists.` 
        });
        setRisks([]);
        return;
      }
      
      if (!risksData) {
        console.warn("No risks data returned from database");
        setRisks([]);
        return;
      }
      
      // Validate and sanitize risk data
      const validatedRisks = risksData.map(risk => {
        try {
          return {
            ...risk,
            inherent_likelihood: Math.max(1, Math.min(5, Number(risk.inherent_likelihood) || 3)),
            inherent_impact: Math.max(1, Math.min(5, Number(risk.inherent_impact) || 3)),
            residual_likelihood: Math.max(1, Math.min(5, Number(risk.residual_likelihood) || 3)),
            residual_impact: Math.max(1, Math.min(5, Number(risk.residual_impact) || 3)),
            score: Number((risk as any).score) || (Number(risk.residual_likelihood) || 0) * (Number(risk.residual_impact) || 0),
            status: ['open', 'in_progress', 'closed'].includes(risk.status) ? risk.status : 'open',
            title: risk.title?.trim() || 'Untitled Risk',
            description: risk.description?.trim() || '',
            category: risk.category?.trim() || 'Uncategorized',
            department: risk.department?.trim() || 'No Department'
          };
        } catch (error) {
          console.error('Error validating risk data:', error, risk);
          return {
            ...risk,
            inherent_likelihood: 3,
            inherent_impact: 3,
            residual_likelihood: 3,
            residual_impact: 3,
            score: 9,
            status: 'open',
            title: 'Invalid Risk Data',
            description: 'This risk contains invalid data',
            category: 'Error',
            department: 'Error'
          };
        }
      });
      
      console.log(`Found ${validatedRisks.length} validated risks`);
      setRisks(validatedRisks);
      setTotalCount(count || validatedRisks.length);
      
      // Fetch treatment plans for each risk with error handling
      if (validatedRisks.length > 0) {
        console.log("Fetching treatment plans for each risk...");
        const plansMap: Record<string, TreatmentPlan[]> = {};
        
        for (const risk of validatedRisks) {
          try {
            const { data: plans, error: plansError } = await supabase
              .from("treatment_plans")
              .select("*")
              .eq("risk_id", risk.id)
              .eq("org_id", orgId)
              .order("created_at", { ascending: false });
            
            if (plansError) {
              console.error(`Error fetching treatment plans for risk ${risk.id}:`, plansError);
              plansMap[risk.id] = [];
            } else {
              // Validate treatment plan data
              const validatedPlans = (plans || []).map(plan => ({
                ...plan,
                action_type: ['accept', 'mitigate', 'transfer', 'avoid'].includes(plan.action_type) ? plan.action_type : 'mitigate',
                status: ['not_started', 'in_progress', 'done'].includes(plan.status) ? plan.status : 'not_started',
                progress: Math.max(0, Math.min(100, Number(plan.progress) || 0)),
                description: plan.description?.trim() || 'No description'
              }));
              plansMap[risk.id] = validatedPlans;
              console.log(`Treatment plans for risk ${risk.id}:`, validatedPlans.length);
            }
          } catch (planError) {
            console.error(`Exception fetching treatment plans for risk ${risk.id}:`, planError);
            plansMap[risk.id] = [];
          }
        }
        setTreatmentPlans(plansMap);
        console.log("Treatment plans loaded for all risks");
      } else {
        console.log("No risks found, clearing treatment plans");
        setTreatmentPlans({});
      }
      
      console.log("fetchRisks completed successfully");
    } catch (e: any) {
      console.error("Exception in fetchRisks:", e);
      toast({ 
        variant: "destructive", 
        title: "System Error", 
        description: e?.message || "An unexpected error occurred while fetching risks. Please try again." 
      });
      setRisks([]);
      setTreatmentPlans({});
      
      // Don't throw the error to prevent UI crashes
      return;
    }
  };

  const fetchProfiles = async () => {
    const orgId = await getRequiredOrgId();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("org_id", orgId);
    setProfilesList((data || []) as { id: string; full_name: string | null }[]);
  };

  const fetchKPIs = async () => {
    const orgId = await getRequiredOrgId();
    const todayISO = new Date().toISOString().slice(0, 10);
    const total = await supabase
      .from("risks")
      .select("id", { count: "exact" })
      .eq("org_id", orgId)
      .limit(0);
    setKpiTotal(total.count || 0);
    const openRisks = await supabase
      .from("risks")
      .select("id, residual_likelihood, residual_impact, status")
      .eq("org_id", orgId)
      .eq("status", "open");
    const openHigh = (openRisks.data || []).filter(r => ((r.residual_likelihood || 0) * (r.residual_impact || 0)) > 12).length;
    setKpiOpenHigh(openHigh);
    const overdue = await supabase
      .from("risks")
      .select("id", { count: "exact" })
      .eq("org_id", orgId)
      .lt("next_review_date", todayISO)
      .neq("status", "closed")
      .limit(0);
    setKpiOverdue(overdue.count || 0);
    const accepted = await supabase
      .from("risks")
      .select("id", { count: "exact" })
      .eq("org_id", orgId)
      .eq("acceptance_status", "accepted")
      .gte("acceptance_expiry", todayISO)
      .limit(0);
    setKpiAccepted(accepted.count || 0);
  };

  useEffect(() => {
    if (selectedRisk) {
      console.log(`Selected risk changed to: ${selectedRisk}`);
      fetchTreatmentPlans(selectedRisk);
    }
  }, [selectedRisk]);

  useEffect(() => {
    fetchRisks();
  }, [page, sortBy, sortDir, statusFilter, categoryFilter]);

  const fetchTreatmentPlans = async (riskId: string) => {
    try {
      setLoadingTreatmentPlans(riskId);
      console.log(`Fetching treatment plans for risk: ${riskId}`);
      const orgId = await getRequiredOrgId();
      const { data } = await supabase
        .from("treatment_plans")
        .select("*")
        .eq("risk_id", riskId)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      
      console.log(`Treatment plans for risk ${riskId}:`, data?.length || 0);
      setTreatmentPlans(prev => ({ ...prev, [riskId]: data || [] }));
    } catch (error) {
      console.error(`Error fetching treatment plans for risk ${riskId}:`, error);
      setTreatmentPlans(prev => ({ ...prev, [riskId]: [] }));
    } finally {
      setLoadingTreatmentPlans(null);
    }
  };

  const filteredRisks = useMemo(() => {
    try {
      const term = searchTerm.trim().toLowerCase();
      const today = new Date();
      today.setHours(0,0,0,0);
      const filtered = risks.filter(risk => {
        const matchesSearch = !term || 
          (risk.title?.toLowerCase().includes(term) ||
           risk.description?.toLowerCase().includes(term) ||
           risk.department?.toLowerCase().includes(term) ||
           (risk.affected_asset || "").toLowerCase().includes(term));
        const matchesCategory = categoryFilter === "all" || risk.category === categoryFilter;
        const matchesStatus = statusFilter === "all" || risk.status === statusFilter;
        const matchesOwner = ownerFilter === "all" || risk.owner === ownerFilter;
        const matchesDelegate = delegateFilter === "all" || risk.delegate_owner === delegateFilter;
        const scoreVal = (risk.score || (risk.residual_likelihood * risk.residual_impact));
        const matchesScoreBucket = scoreBucket === "all" ||
          (scoreBucket === "low" && scoreVal <= 6) ||
          (scoreBucket === "medium" && scoreVal > 6 && scoreVal <= 12) ||
          (scoreBucket === "high" && scoreVal > 12 && scoreVal <= 20) ||
          (scoreBucket === "critical" && scoreVal > 20);
        const nextReview = risk.next_review_date ? new Date(risk.next_review_date) : null;
        if (nextReview) nextReview.setHours(0,0,0,0);
        const due30 = nextReview ? (nextReview.getTime() - today.getTime())/(24*60*60*1000) <= 30 && nextReview >= today : false;
        const overdue = nextReview ? nextReview < today : false;
        const matchesReview = reviewFilter === "all" || (reviewFilter === "due_30" && due30) || (reviewFilter === "overdue" && overdue);
        const matchesDept = departmentFilter === "all" || risk.department === departmentFilter;
        const matchesAsset = assetFilter === "all" || risk.affected_asset === assetFilter;
        const isExpired = risk.acceptance_status === "accepted" && risk.acceptance_expiry && new Date(risk.acceptance_expiry) < today;
        const matchesAcceptance = acceptanceFilter === "all" ||
          (acceptanceFilter === "none" && (!risk.acceptance_status || risk.acceptance_status === "none")) ||
          (acceptanceFilter === "requested" && risk.acceptance_status === "requested") ||
          (acceptanceFilter === "accepted" && risk.acceptance_status === "accepted" && !isExpired) ||
          (acceptanceFilter === "rejected" && risk.acceptance_status === "rejected") ||
          (acceptanceFilter === "expired" && isExpired);
        return matchesSearch && matchesCategory && matchesStatus && matchesOwner && matchesDelegate && matchesScoreBucket && matchesReview && matchesDept && matchesAsset && matchesAcceptance;
      });
      return filtered;
    } catch (error) {
      console.error("Error filtering risks:", error);
      return risks;
    }
  }, [risks, searchTerm, categoryFilter, statusFilter, ownerFilter, delegateFilter, scoreBucket, reviewFilter, departmentFilter, assetFilter, acceptanceFilter]);

  const handleExportCSV = () => {
    try {
      const headers = [
        "id","title","status","inherent_likelihood","inherent_impact","residual_likelihood","residual_impact","score","owner","delegate_owner","category","department","affected_asset","next_review_date","acceptance_status","acceptance_expiry","updated_at"
      ];
      const rows = filteredRisks.map((r) => [
        r.id,
        (r.title || "").replace(/\n/g, " ").replace(/,/g, ";"),
        r.status || "",
        r.inherent_likelihood ?? "",
        r.inherent_impact ?? "",
        r.residual_likelihood ?? "",
        r.residual_impact ?? "",
        (r.score ?? ((r.residual_likelihood || 0) * (r.residual_impact || 0))).toString(),
        r.owner || "",
        r.delegate_owner || "",
        r.category || "",
        r.department || "",
        r.affected_asset || "",
        r.next_review_date || "",
        r.acceptance_status || "",
        r.acceptance_expiry || "",
        r.updated_at || ""
      ]);
      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `risk_register_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "Risk register CSV downloaded." });
    } catch (e) {
      toast({ variant: "destructive", title: "Export failed", description: "Unable to generate CSV." });
    }
  };

  const categories = useMemo(() => {
    try {
      const cats = [...new Set(risks.map(r => r.category).filter(Boolean))];
      return cats.sort();
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  }, [risks]);

  const departments = useMemo(() => {
    try {
      const deps = [...new Set(risks.map(r => r.department).filter(Boolean))];
      return deps.sort();
    } catch {
      return [];
    }
  }, [risks]);

  const assets = useMemo(() => {
    try {
      const aset = [...new Set(risks.map(r => r.affected_asset).filter(Boolean))];
      return aset.sort();
    } catch {
      return [];
    }
  }, [risks]);

  // Creation handled by RiskDialog component

  // Error boundary for render errors
  if (renderError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive mb-2">💥</div>
          <h3 className="text-lg font-semibold text-destructive mb-2">Render Error</h3>
          <p className="text-muted-foreground mb-4">{renderError}</p>
          <Button onClick={() => { setRenderError(null); window.location.reload(); }}>Reload Page</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading risks...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Risks</h3>
          <p className="text-muted-foreground mb-4">{loadError}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  try {
    // Add error boundary for the main render
    if (hasError && componentError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-destructive mb-2">💥</div>
            <h3 className="text-lg font-semibold text-destructive mb-2">Component Error</h3>
            <p className="text-muted-foreground mb-4">An unexpected error occurred in the Risks component.</p>
            <p className="text-sm text-muted-foreground mb-4">{componentError.message}</p>
            <Button onClick={() => { setHasError(false); setComponentError(null); window.location.reload(); }}>Reload Page</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative min-h-screen overflow-hidden">
        {/* Creative background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-rose-50 to-amber-50" />
        <div className="absolute inset-0 -z-10 opacity-[0.06]" style={{backgroundImage:"radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)", backgroundSize:"24px 24px"}} />

        <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/80 p-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" /> Risk Management
              </h2>
              <p className="mt-1 text-slate-600">Identify, assess, and manage organizational risks.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExportCSV} title="Export risk register (CSV)">Export CSV</Button>
              {canEdit && (
                <Button 
                  onClick={() => setAddDialogOpen(true)} 
                  className="bg-rose-600 hover:bg-rose-700 text-white" 
                  disabled={!!limits && !!counts && counts.risks >= limits.max_risks}
                  title={limits && counts && counts.risks >= limits.max_risks ? 'Risk limit reached — upgrade in Settings' : undefined}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Risk
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Total Risks</p>
                    <p className="text-2xl font-bold text-slate-900">{kpiTotal}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-slate-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800">Open High/Critical</p>
                    <p className="text-2xl font-bold text-red-900">{kpiOpenHigh}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-800">Overdue Reviews</p>
                    <p className="text-2xl font-bold text-amber-900">{kpiOverdue}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Accepted Risks</p>
                    <p className="text-2xl font-bold text-green-900">{kpiAccepted}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-3 border-slate-200/60 bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Risk Register</CardTitle>
              </CardHeader>
              <CardContent>
                {limits && counts && counts.risks >= limits.max_risks && (
                  <div className="mb-3 rounded border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm">
                    Risk limit reached for your plan. Visit Settings to upgrade.
                  </div>
                )}
                
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search risks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label className="text-xs">Owner</Label>
                      <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Owners</SelectItem>
                          {profilesList.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name || p.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Delegate</Label>
                      <Select value={delegateFilter} onValueChange={setDelegateFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {profilesList.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name || p.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label className="text-xs">Score</Label>
                      <Select value={scoreBucket} onValueChange={setScoreBucket}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Acceptance</Label>
                      <Select value={acceptanceFilter} onValueChange={setAcceptanceFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="requested">Requested</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label className="text-xs">Review Date</Label>
                      <Select value={reviewFilter} onValueChange={setReviewFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="due_30">Due in 30 days</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Department</Label>
                      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d as string} value={d as string}>{d as string}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs">Asset</Label>
                    <Select value={assetFilter} onValueChange={setAssetFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {assets.map((a) => (
                          <SelectItem key={a as string} value={a as string}>{a as string}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {filteredRisks.length === 0 ? (
                    <p className="text-sm text-slate-600">No risks found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="table-fixed w-full">
                        <colgroup>
                          <col className="w-[40%]" />
                          <col className="w-[14%]" />
                          <col className="w-[14%]" />
                          <col className="w-[18%]" />
                          <col className="w-[14%]" />
                        </colgroup>
                        <TableHeader>
                          <TableRow className="bg-slate-50/60">
                            <TableHead className="cursor-pointer text-left" onClick={() => { setSortBy('title'); setSortDir(sortBy === 'title' && sortDir === 'asc' ? 'desc' : 'asc'); }}>Title</TableHead>
                            <TableHead className="text-left">Risk Level</TableHead>
                            <TableHead className="cursor-pointer text-left" onClick={() => { setSortBy('status'); setSortDir(sortBy === 'status' && sortDir === 'asc' ? 'desc' : 'asc'); }}>Status</TableHead>
                            <TableHead className="text-left">Owner</TableHead>
                            <TableHead className="cursor-pointer text-left" onClick={() => { setSortBy('next_review_date'); setSortDir(sortBy === 'next_review_date' && sortDir === 'asc' ? 'desc' : 'asc'); }}>Next Review</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRisks.map((risk) => {
                            const scoreVal = risk.score || (risk.residual_likelihood * risk.residual_impact);
                            const level = (scoreVal <= 6) ? 'Low' : (scoreVal <= 12) ? 'Medium' : (scoreVal <= 20) ? 'High' : 'Critical';
                            const levelClass = level === 'Low' ? 'bg-green-100 text-green-700' : level === 'Medium' ? 'bg-amber-100 text-amber-700' : level === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
                            return (
                              <TableRow key={risk.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedRisk(risk.id); setDetailOpen(true); }}>
                                <TableCell className="font-medium truncate" title={risk.title}>{risk.title}</TableCell>
                                <TableCell>
                                  <Badge className={`${levelClass}`}>{level}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${
                                    risk.status === 'open' ? 'bg-rose-100 text-rose-700' :
                                    risk.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>{risk.status}</Badge>
                                </TableCell>
                                <TableCell className="truncate" title={profilesList.find(p => p.id === risk.owner)?.full_name || '—'}>
                                  {profilesList.find(p => p.id === risk.owner)?.full_name || '—'}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{risk.next_review_date ? new Date(risk.next_review_date).toLocaleDateString() : '—'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-slate-600">Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                    <Button variant="outline" disabled={page >= Math.ceil(totalCount / pageSize)} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            
          </div>

          {selectedRisk && (
            <RiskDetail 
              risk={risks.find(r => r.id === selectedRisk) as unknown as Tables<'risks'>}
              open={detailOpen}
              onOpenChange={setDetailOpen}
              onUpdate={fetchRisks}
              canEdit={canEdit}
            />
          )}

          <RiskDialog
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
            onSuccess={fetchRisks}
          />
        </div>
      </div>
    );
  } catch (renderError) {
    console.error("Critical render error in Risks page:", renderError);
    const errorMessage = renderError instanceof Error ? renderError.message : 'Unknown render error';
    setComponentError(new Error(errorMessage));
    setHasError(true);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive mb-2">💥</div>
          <h3 className="text-lg font-semibold text-destructive mb-2">Critical Error</h3>
          <p className="text-muted-foreground mb-4">The Risks page encountered an unexpected error.</p>
          <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
          <Button onClick={() => { setComponentError(null); setHasError(false); window.location.reload(); }}>Reload Page</Button>
        </div>
      </div>
    );
  }
};

export default Risks;