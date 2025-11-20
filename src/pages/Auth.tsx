import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, CheckCircle2, FileText, ListTodo, User, Building2 } from "lucide-react";
import { useCurrentOrg } from "@/context/CurrentOrgProvider";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ssoGoogleEnabled, setSsoGoogleEnabled] = useState<boolean>(false);
  const [ssoAzureEnabled, setSsoAzureEnabled] = useState<boolean>(false);
  const [orgHint, setOrgHint] = useState<string>("");
  const { org } = useCurrentOrg();
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgForm, setOrgForm] = useState({
    orgName: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminConfirmPassword: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
    // Discover tenant by hostname for SSO readiness
    (async () => {
      try {
        const host = window.location.hostname;
        if (!host) return;
        let query = supabase.from("organizations").select("id, slug, custom_domain, sso_google_enabled, sso_azure_enabled").limit(1);
        if (host.endsWith("grc-guard.com")) {
          const sub = host.split(".")[0];
          query = supabase.from("organizations").select("id, slug, custom_domain, sso_google_enabled, sso_azure_enabled").eq("slug", sub).limit(1);
          setOrgHint(sub);
        } else {
          query = supabase.from("organizations").select("id, slug, custom_domain, sso_google_enabled, sso_azure_enabled").eq("custom_domain", host).limit(1);
          setOrgHint(host);
        }
        const { data } = await query;
        const row = (data && data[0]) || null;
        setSsoGoogleEnabled(!!row?.sso_google_enabled);
        setSsoAzureEnabled(!!row?.sso_azure_enabled);
      } catch {
        // ignore errors in discovery
      }
    })();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      navigate("/dashboard");
    }

    setLoading(false);
  };

  const handleOrgSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOrgLoading(true);
    const name = orgForm.orgName.trim();
    const fullName = orgForm.adminName.trim();
    const email = orgForm.adminEmail.trim();
    const password = orgForm.adminPassword;
    const confirm = orgForm.adminConfirmPassword;
    if (!name || name.length < 2) {
      toast({ variant: "destructive", title: "Invalid organization name", description: "Provide a valid organization name." });
      setOrgLoading(false);
      return;
    }
    if (!fullName || fullName.length < 2) {
      toast({ variant: "destructive", title: "Invalid admin name", description: "Provide the admin's full name." });
      setOrgLoading(false);
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ variant: "destructive", title: "Invalid email", description: "Provide a valid admin email." });
      setOrgLoading(false);
      return;
    }
    const score = [
      password.length >= 8,
      /[A-Z]/.test(password) && /[a-z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;
    if (score < 3) {
      toast({ variant: "destructive", title: "Weak password", description: "Use at least 8 chars with upper, lower, number." });
      setOrgLoading(false);
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "Passwords do not match", description: "Re-enter matching passwords." });
      setOrgLoading(false);
      return;
    }
    try {
      localStorage.setItem("pending_org", JSON.stringify({ name }));
    } catch { void 0; }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, org_pending_name: name },
      },
    });
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Check your email", description: "Verify email to activate your workspace." });
    }
    setOrgLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Modern gradient background with subtle animations */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/10 to-teal-400/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-[-6rem] right-10 h-80 w-80 rounded-full bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-2xl animate-pulse" style={{animationDelay: '2s'}} />
      <div className="absolute inset-0 -z-10 opacity-[0.07]" style={{backgroundImage:"radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize:"24px 24px"}} />

      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        {/* Left brand panel with enhanced design */}
        <div className="hidden md:flex items-center justify-center p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative z-10 max-w-lg">
            <div className="mb-8 md:mb-10">
              <div className="h-16 w-16 md:h-20 md:w-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:shadow-xl">
                <img src="/aegis-logo.png" alt="Logo" className="h-8 w-8 md:h-12 md:w-12 text-white object-contain transition-transform duration-300 hover:scale-105" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Secure GRC Platform
            </h1>
            <p className="mt-4 text-xl text-slate-300 leading-relaxed">
              Modern Governance, Risk & Compliance. Secure operations, streamlined controls, clear oversight.
            </p>

            {/* Enhanced feature badges with hover effects */}
            <div className="mt-12 grid grid-cols-2 gap-4">
              <div className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-white">Risk Register</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">Assess likelihood, impact, and track remediation.</p>
              </div>
              <div className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-white">Compliance</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">Frameworks, controls, status, and evidence.</p>
              </div>
              <div className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-white">Policies</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">Versioning and review workflows.</p>
              </div>
              <div className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3 mb-2">
                  <ListTodo className="h-5 w-5 text-pink-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-white">Tasks & Reports</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">Assigned actions and executive summaries.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right auth card with modern design */}
        <div className="flex items-center justify-center p-4 md:p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
          <Card className="w-full max-w-sm md:max-w-md border-white/10 bg-white/95 backdrop-blur-xl shadow-2xl relative z-10 hover:shadow-3xl transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl text-white shadow-lg transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: org?.brand_color || undefined }}>
                <img src="/aegis-logo.png" alt="Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain transition-transform duration-300 hover:scale-105" />
              </div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Welcome Back</CardTitle>
              <CardDescription className="text-sm md:text-base text-slate-600">Sign in to your workspace or create a new organization</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <div className="relative bg-gradient-to-br from-slate-100 to-slate-200/50 backdrop-blur-sm rounded-2xl p-2 mb-8 border border-slate-300/30 shadow-inner">
                  <TabsList className="grid w-full grid-cols-2 bg-transparent h-auto p-0 relative">
                    <TabsTrigger 
                      value="login" 
                      className="relative z-10 data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600 hover:text-slate-800 transition-all duration-300 rounded-xl py-3 px-4 font-semibold text-sm md:text-base flex items-center justify-center gap-2 border-0 shadow-sm data-[state=active]:shadow-lg data-[state=active]:scale-105"
                    >
                      <div className="relative">
                        <User className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 data-[state=active]:scale-110" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full opacity-0 data-[state=active]:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <span className="tracking-wide">Sign In</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="orgsignup" 
                      className="relative z-10 data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600 hover:text-slate-800 transition-all duration-300 rounded-xl py-3 px-4 font-semibold text-sm md:text-base flex items-center justify-center gap-2 border-0 shadow-sm data-[state=active]:shadow-lg data-[state=active]:scale-105"
                    >
                      <div className="relative">
                        <Building2 className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-300 data-[state=active]:scale-110" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full opacity-0 data-[state=active]:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <span className="tracking-wide">Create Organization</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="login" className="space-y-6">
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">Email Address</Label>
                      <Input 
                        id="login-email" 
                        name="email" 
                        type="email" 
                        placeholder="you@example.com" 
                        required 
                        className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">Password</Label>
                      <Input 
                        id="login-password" 
                        name="password" 
                        type="password" 
                        required 
                        className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                  
                  {(ssoGoogleEnabled || ssoAzureEnabled) && (
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white/95 text-slate-500">Or continue with SSO {orgHint ? `(${orgHint})` : ""}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {ssoGoogleEnabled && (
                          <Button 
                            variant="outline" 
                            className="h-12 text-base border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                            onClick={async ()=>{
                              const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
                              if (error) toast({ variant: "destructive", title: "SSO error", description: error.message });
                            }}
                          >
                            Sign in with Google
                          </Button>
                        )}
                        {ssoAzureEnabled && (
                          <Button 
                            variant="outline" 
                            className="h-12 text-base border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                            onClick={async ()=>{
                              const { error } = await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/dashboard` } });
                              if (error) toast({ variant: "destructive", title: "SSO error", description: error.message });
                            }}
                          >
                            Sign in with Azure
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="orgsignup" className="space-y-6">
                  <form onSubmit={handleOrgSignup} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="org_name" className="text-sm font-medium text-slate-700">Organization Name</Label>
                      <Input 
                        id="org_name" 
                        value={orgForm.orgName} 
                        onChange={(e)=>setOrgForm({ ...orgForm, orgName: e.target.value })} 
                        required 
                        className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin_name" className="text-sm font-medium text-slate-700">Admin Full Name</Label>
                        <Input 
                          id="admin_name" 
                          value={orgForm.adminName} 
                          onChange={(e)=>setOrgForm({ ...orgForm, adminName: e.target.value })} 
                          required 
                          className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin_email" className="text-sm font-medium text-slate-700">Admin Email</Label>
                        <Input 
                          id="admin_email" 
                          type="email" 
                          value={orgForm.adminEmail} 
                          onChange={(e)=>setOrgForm({ ...orgForm, adminEmail: e.target.value })} 
                          required 
                          className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin_password" className="text-sm font-medium text-slate-700">Password</Label>
                        <Input 
                          id="admin_password" 
                          type="password" 
                          value={orgForm.adminPassword} 
                          onChange={(e)=>setOrgForm({ ...orgForm, adminPassword: e.target.value })} 
                          required 
                          className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin_confirm" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                        <Input 
                          id="admin_confirm" 
                          type="password" 
                          value={orgForm.adminConfirmPassword} 
                          onChange={(e)=>setOrgForm({ ...orgForm, adminConfirmPassword: e.target.value })} 
                          required 
                          className="h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={orgLoading}
                    >
                      {orgLoading ? "Creating organization..." : "Create Organization"}
                    </Button>
                    <p className="text-xs text-slate-500 text-center bg-slate-50 rounded-lg p-3 border border-slate-200">
                      Email verification is required to activate the workspace.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
              
              <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">
                  By continuing, you agree to our{' '}
                  <a href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">Terms of Service</a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">Privacy Policy</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
