import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Risks from "./pages/Risks";
import Compliance from "./pages/Compliance";
import Policies from "./pages/Policies";
import Users from "./pages/Users";
import Tasks from "./pages/Tasks";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import Frameworks from "./pages/Frameworks";
import Evidence from "./pages/Evidence";
import Settings from "./pages/Settings";
import Usage from "./pages/Usage";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import { CurrentOrgProvider } from "@/context/CurrentOrgProvider";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import HelpCenter from "./pages/HelpCenter";
import Documentation from "./pages/Documentation";
import APIReference from "./pages/APIReference";
import SystemStatus from "./pages/SystemStatus";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CurrentOrgProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/docs" element={<Documentation />} />
            <Route path="/api" element={<APIReference />} />
            <Route path="/status" element={<SystemStatus />} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/risks" element={<Layout><Risks /></Layout>} />
            <Route path="/compliance" element={<Layout><Compliance /></Layout>} />
            <Route path="/frameworks" element={<Layout><Frameworks /></Layout>} />
            <Route path="/evidence" element={<Layout><Evidence /></Layout>} />
            <Route path="/policies" element={<Layout><Policies /></Layout>} />
            <Route path="/billing" element={<Layout><Billing /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/usage" element={<Layout><Usage /></Layout>} />
            <Route path="/users" element={<Layout><Users /></Layout>} />
            <Route path="/tasks" element={<Layout><Tasks /></Layout>} />
            <Route path="/reports" element={<Layout><Reports /></Layout>} />
            <Route path="/audit" element={<Layout><Audit /></Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CurrentOrgProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;