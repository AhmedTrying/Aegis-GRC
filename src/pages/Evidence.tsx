import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRequiredOrgId } from "@/integrations/supabase/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Search, FileText, Calendar, User, CheckCircle, XCircle, Clock } from "lucide-react";

interface Evidence {
  id: string;
  control_id: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  updated_at: string;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewer?: string;
  reviewed_at?: string;
  expires_at?: string;
  version: string;
  org_id: string;
}

interface Control {
  id: string;
  code: string;
  description: string;
  framework_id: string;
}

interface Framework {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string;
}

const Evidence = () => {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const orgId = await getRequiredOrgId();

      // Fetch evidences
      const { data: evidencesData, error: evidencesError } = await supabase
        .from("control_evidences")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (evidencesError) throw evidencesError;
      setEvidences(evidencesData || []);

      // Fetch controls
      const { data: controlsData, error: controlsError } = await supabase
        .from("controls")
        .select("id, code, description, framework_id")
        .eq("org_id", orgId);

      if (controlsError) throw controlsError;
      setControls(controlsData || []);

      // Fetch frameworks
      const { data: frameworksData, error: frameworksError } = await supabase
        .from("frameworks")
        .select("id, name")
        .eq("org_id", orgId);

      if (frameworksError) throw frameworksError;
      setFrameworks(frameworksData || []);

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("org_id", orgId);

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch evidence data"
      });
    } finally {
      setLoading(false);
    }
  };

  const getControlInfo = (controlId: string) => {
    return controls.find(c => c.id === controlId);
  };

  const getFrameworkInfo = (frameworkId: string) => {
    return frameworks.find(f => f.id === frameworkId);
  };

  const getProfileInfo = (profileId: string) => {
    return profiles.find(p => p.id === profileId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'pending_review':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredEvidences = evidences.filter(evidence => {
    const control = getControlInfo(evidence.control_id);
    const framework = control ? getFrameworkInfo(control.framework_id) : null;
    const uploader = getProfileInfo(evidence.uploaded_by);
    
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        evidence.file_name.toLowerCase().includes(searchLower) ||
        (control?.code.toLowerCase().includes(searchLower)) ||
        (control?.description.toLowerCase().includes(searchLower)) ||
        (uploader?.full_name.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all" && evidence.status !== statusFilter) return false;

    // Framework filter
    if (frameworkFilter !== "all") {
      if (!control || control.framework_id !== frameworkFilter) return false;
    }

    return true;
  });

  const handleViewEvidence = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const handleStatusUpdate = async (evidenceId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const orgId = await getRequiredOrgId();
      const { error } = await supabase
        .from("control_evidences")
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", evidenceId)
        .eq("org_id", orgId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Evidence ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`
      });

      fetchData();
    } catch (error) {
      console.error("Error updating evidence status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update evidence status"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Evidence</h2>
            <p className="text-muted-foreground">Manage control evidence and documentation</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Evidence</h2>
          <p className="text-muted-foreground">Manage control evidence and documentation</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evidence Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search evidence by file name, control code, or uploader..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              className="px-3 py-2 border rounded-md"
              value={frameworkFilter}
              onChange={(e) => setFrameworkFilter(e.target.value)}
            >
              <option value="all">All Frameworks</option>
              {frameworks.map(framework => (
                <option key={framework.id} value={framework.id}>{framework.name}</option>
              ))}
            </select>
          </div>

          {filteredEvidences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No evidence found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Control</TableHead>
                    <TableHead>Framework</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Uploaded At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvidences.map((evidence) => {
                    const control = getControlInfo(evidence.control_id);
                    const framework = control ? getFrameworkInfo(control.framework_id) : null;
                    const uploader = getProfileInfo(evidence.uploaded_by);
                    
                    return (
                      <TableRow key={evidence.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{evidence.file_name}</span>
                            {evidence.version > 1 && (
                              <Badge variant="outline">v{evidence.version}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{control?.code}</div>
                            <div className="text-sm text-muted-foreground">{control?.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{framework?.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{uploader?.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(evidence.updated_at).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(evidence.status)}</TableCell>
                        <TableCell>
                          {evidence.expires_at ? (
                            <span className={`text-sm ${
                              new Date(evidence.expires_at) < new Date() 
                                ? 'text-red-600' 
                                : 'text-muted-foreground'
                            }`}>
                              {new Date(evidence.expires_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No expiry</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewEvidence(evidence.file_url)}
                            >
                              View
                            </Button>
                            {evidence.status === 'pending_review' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleStatusUpdate(evidence.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleStatusUpdate(evidence.id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Evidence;