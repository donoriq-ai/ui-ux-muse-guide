import { Link, useRouterState } from "@tanstack/react-router";
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
import { Users, ScrollText, Settings, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Donors", url: "/donors", icon: Users },
  { title: "Audit", url: "/audit", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string) =>
    pathname === url || (url !== "/" && pathname.startsWith(url + "/")) || (url === "/donors" && pathname.startsWith("/donors"));

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
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Donor review</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
