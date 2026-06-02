import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { currentUserQuery, qk, tenantQuery } from "@/lib/api/queries";
import * as api from "@/lib/api/client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, LogOut, User as UserIcon } from "lucide-react";
import type { Role } from "@/lib/api/types";

const roleLabel: Record<Role, string> = {
  coordinator: "Coordinator",
  medical_director: "Medical Director",
  admin: "Admin",
};

export function TopBar() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: user } = useQuery(currentUserQuery());
  const { data: tenant } = useQuery(tenantQuery());

  const setRoleM = useMutation({
    mutationFn: (role: Role) => api.setRole(role),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.currentUser }),
  });

  const logoutM = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.currentUser });
      navigate({ to: "/login" });
    },
  });

  return (
    <header className="no-print h-12 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30">
      <div className="h-full flex items-center gap-3 px-3 sm:px-4">
        <SidebarTrigger className="-ml-1" />

        <div className="hidden sm:flex items-center gap-2 pl-2 pr-3 border-l border-border h-7">
          <Building2 size={13} className="text-muted-foreground" />
          <span className="text-xs font-medium">{tenant?.name ?? "—"}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Select value={user?.role} onValueChange={(v) => setRoleM.mutate(v as Role)}>
            <SelectTrigger className="h-8 w-[160px] text-xs" aria-label="Switch role">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coordinator">{roleLabel.coordinator}</SelectItem>
              <SelectItem value="medical_director">{roleLabel.medical_director}</SelectItem>
              <SelectItem value="admin">{roleLabel.admin}</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 h-8 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="grid place-items-center size-6 rounded-full bg-primary-soft text-primary text-[11px] font-semibold">
                {user?.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("") ?? "?"}
              </span>
              <span className="hidden md:inline text-xs font-medium">{user?.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-sm">{user?.name}</span>
                <span className="text-[11px] text-muted-foreground font-normal">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <UserIcon className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  logoutM.mutate();
                }}
                disabled={logoutM.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {logoutM.isPending ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
