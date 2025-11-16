import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Risks from "./pages/Risks";
import Compliance from "./pages/Compliance";
import Policies from "./pages/Policies";
import Users from "./pages/Users";
import Tasks from "./pages/Tasks";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import Frameworks from "./pages/Frameworks";
import Settings from "./pages/Settings";
import Usage from "./pages/Usage";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import { CurrentOrgProvider } from "@/context/CurrentOrgProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CurrentOrgProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/risks" element={<Layout><Risks /></Layout>} />
            <Route path="/compliance" element={<Layout><Compliance /></Layout>} />
            <Route path="/frameworks" element={<Layout><Frameworks /></Layout>} />
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