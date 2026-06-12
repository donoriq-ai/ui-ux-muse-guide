import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Users, UsersRound, ScrollText, Settings, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentUserQuery } from "@/lib/api/queries";

type NavItem = { title: string; url: string; icon: typeof Users; adminOnly?: boolean };

const items: NavItem[] = [
  { title: "Donors", url: "/donors", icon: Users },
  { title: "Users", url: "/users", icon: UsersRound, adminOnly: true },
  { title: "Audit", url: "/audit", icon: ScrollText, adminOnly: true },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { data: user } = useQuery(currentUserQuery());
  const isAdmin = user?.role === "admin";
  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin);

  const isActive = (url: string) =>
    pathname === url ||
    (url !== "/" && pathname.startsWith(url + "/")) ||
    (url === "/donors" && pathname.startsWith("/donors"));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/donors" className="flex items-center gap-2.5 px-2 h-12">
          <span className="grid place-items-center size-7 rounded bg-primary text-primary-foreground shrink-0">
            <Activity size={15} strokeWidth={2.4} />
          </span>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-medium text-sm text-sidebar-foreground">TissueQA</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Donor review
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className={cn("flex items-center gap-2")}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
