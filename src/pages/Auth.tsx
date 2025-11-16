import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, CheckCircle2, FileText, ListTodo } from "lucide-react";
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
    legalName: "",
    industry: "",
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

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Account created! Please check your email to confirm.",
      });
    }

    setLoading(false);
  };

  const handleOrgSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOrgLoading(true);
    const name = orgForm.orgName.trim();
    const legal = orgForm.legalName.trim();
    const industry = orgForm.industry.trim();
    const fullName = orgForm.adminName.trim();
    const email = orgForm.adminEmail.trim();
    const password = orgForm.adminPassword;
    const confirm = orgForm.adminConfirmPassword;
    if (!name || name.length < 2) {
      toast({ variant: "destructive", title: "Invalid organization name", description: "Provide a valid organization name." });
      setOrgLoading(false);
      return;
    }
    if (!legal || legal.length < 2) {
      toast({ variant: "destructive", title: "Invalid legal name", description: "Provide a valid legal name." });
      setOrgLoading(false);
      return;
    }
    if (!industry) {
      toast({ variant: "destructive", title: "Industry required", description: "Select or enter an industry." });
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
      localStorage.setItem("pending_org", JSON.stringify({ name, legal, industry }));
    } catch { void 0; }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
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
      {/* Background layers */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/10 to-teal-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-6rem] right-10 h-80 w-80 rounded-full bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-2xl" />
      <div className="absolute inset-0 -z-10 opacity-[0.07]" style={{backgroundImage:"radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize:"24px 24px"}} />

      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        {/* Left brand panel */}
        <div className="hidden md:flex items-center justify-center p-10">
          <div className="max-w-lg">
            <div className="mb-6 flex items-center gap-3">
              {org?.logo_url ? (
                <img src={org.logo_url} alt="Logo" className="h-10 w-10" />
              ) : (
                <img src="/aegis-logo.svg" alt="Aegis GRC" className="h-10 w-10" />
              )}
              <span className="text-xl font-semibold text-white">{org?.name ?? "Aegis GRC"}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Operate with confidence.
            </h1>
            <p className="mt-3 text-slate-300">
              Modern Governance, Risk & Compliance. Secure operations, streamlined controls, clear oversight.
            </p>

            {/* Feature badges */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-white">Risk Register</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">Assess likelihood, impact, and track remediation.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-white">Compliance</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">Frameworks, controls, status, and evidence.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Policies</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">Versioning and review workflows.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-pink-400" />
                  <span className="text-sm font-medium text-white">Tasks & Reports</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">Assigned actions and executive summaries.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right auth card */}
        <div className="flex items-center justify-center p-6">
          <Card className="w-full max-w-md border-white/10 bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: org?.brand_color || undefined }}>
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">{org?.name ?? "Aegis GRC"}</CardTitle>
              <CardDescription>Sign in to your workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  <TabsTrigger value="orgsignup">Create Organization</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" name="email" type="email" placeholder="you@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input id="login-password" name="password" type="password" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                  {(ssoGoogleEnabled || ssoAzureEnabled) && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs text-muted-foreground text-center">Or continue with SSO {orgHint ? `(${orgHint})` : ""}</div>
                      {ssoGoogleEnabled && (
                        <Button variant="outline" className="w-full" onClick={async ()=>{
                          const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/dashboard` } });
                          if (error) toast({ variant: "destructive", title: "SSO error", description: error.message });
                        }}>Sign in with Google</Button>
                      )}
                      {ssoAzureEnabled && (
                        <Button variant="outline" className="w-full" onClick={async ()=>{
                          const { error } = await supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: `${window.location.origin}/dashboard` } });
                          if (error) toast({ variant: "destructive", title: "SSO error", description: error.message });
                        }}>Sign in with Azure</Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input id="signup-name" name="fullName" type="text" placeholder="John Doe" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" name="email" type="email" placeholder="you@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" name="password" type="password" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="orgsignup">
                  <form onSubmit={handleOrgSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="org_name">Organization Name</Label>
                      <Input id="org_name" value={orgForm.orgName} onChange={(e)=>setOrgForm({ ...orgForm, orgName: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="legal_name">Legal Name</Label>
                      <Input id="legal_name" value={orgForm.legalName} onChange={(e)=>setOrgForm({ ...orgForm, legalName: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input id="industry" value={orgForm.industry} onChange={(e)=>setOrgForm({ ...orgForm, industry: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin_name">Admin Full Name</Label>
                        <Input id="admin_name" value={orgForm.adminName} onChange={(e)=>setOrgForm({ ...orgForm, adminName: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin_email">Admin Email</Label>
                        <Input id="admin_email" type="email" value={orgForm.adminEmail} onChange={(e)=>setOrgForm({ ...orgForm, adminEmail: e.target.value })} required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin_password">Password</Label>
                        <Input id="admin_password" type="password" value={orgForm.adminPassword} onChange={(e)=>setOrgForm({ ...orgForm, adminPassword: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin_confirm">Confirm Password</Label>
                        <Input id="admin_confirm" type="password" value={orgForm.adminConfirmPassword} onChange={(e)=>setOrgForm({ ...orgForm, adminConfirmPassword: e.target.value })} required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={orgLoading}>{orgLoading ? "Creating organization..." : "Create Organization"}</Button>
                    <p className="text-xs text-muted-foreground text-center">Email verification is required to activate the workspace.</p>
                  </form>
                </TabsContent>
              </Tabs>
              <p className="mt-4 text-center text-xs text-muted-foreground">By continuing, you agree to the Terms of Service and Privacy Policy.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
