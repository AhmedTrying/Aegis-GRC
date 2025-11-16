import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ListTodo,
  BarChart3,
  Shield,
  GitBranch,
  CreditCard,
  Database,
  Cog,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentOrg } from "@/context/CurrentOrgProvider";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Risks", url: "/risks", icon: AlertTriangle },
  { title: "Compliance", url: "/compliance", icon: CheckCircle2 },
  { title: "Frameworks", url: "/frameworks", icon: GitBranch },
  { title: "Policies", url: "/policies", icon: FileText },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Evidence", url: "/compliance", icon: Shield },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Audit", url: "/audit", icon: BarChart3 },
];

export function AppSidebar() {
  const { role } = useUserRole();
  const location = useLocation();
  const currentPath = location.pathname;
  const { org } = useCurrentOrg();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar">
        <div className="p-4 flex items-center gap-2 border-b border-sidebar-border">
          {org?.logo_url ? (
            <img src={org.logo_url} alt="Logo" className="h-6 w-6 rounded" />
          ) : (
            <Shield className="h-6 w-6" style={{ color: org?.brand_color || undefined }} />
          )}
          <span className="font-semibold text-sidebar-foreground">{org?.name ?? "Aegis GRC"}</span>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild size="lg" className="text-base">
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 ${
                          isActive
                            ? "text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }`}
                        style={isActive ? { backgroundColor: org?.brand_color || undefined } : undefined}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild size="lg" className="text-base">
                    <NavLink
                      to="/usage"
                      className={`flex items-center gap-3 ${
                        currentPath === "/usage"
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                      style={currentPath === "/usage" ? { backgroundColor: org?.brand_color || undefined } : undefined}
                    >
                      <Database className="h-5 w-5" />
                      <span>Usage</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild size="lg" className="text-base">
                    <NavLink
                      to="/users"
                      className={`flex items-center gap-3 ${
                        currentPath === "/users"
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                      style={currentPath === "/users" ? { backgroundColor: org?.brand_color || undefined } : undefined}
                    >
                      <Shield className="h-5 w-5" />
                      <span>Users</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild size="lg" className="text-base">
                    <NavLink
                      to="/settings"
                      className={`flex items-center gap-3 ${
                        currentPath === "/settings"
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                      style={currentPath === "/settings" ? { backgroundColor: org?.brand_color || undefined } : undefined}
                    >
                      <Cog className="h-5 w-5" />
                      <span>Settings</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild size="lg" className="text-base">
                    <NavLink
                      to="/billing"
                      className={`flex items-center gap-3 ${
                        currentPath === "/billing"
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                      style={currentPath === "/billing" ? { backgroundColor: org?.brand_color || undefined } : undefined}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>Billing</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
