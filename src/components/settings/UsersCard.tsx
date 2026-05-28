import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/SectionCard";
import * as api from "@/lib/api/mockApi";
import { qk } from "@/lib/api/queries";
import type { Role, User } from "@/lib/api/types";

const ROLE_LABEL: Record<Role, string> = {
  coordinator: "Coordinator",
  medical_director: "Medical Director",
  admin: "Administrator",
};

export function UsersCard({
  users,
  currentUserId,
  canEdit,
}: {
  users: User[];
  currentUserId: string;
  canEdit: boolean;
}) {
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      api.updateUserRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.users });
      qc.invalidateQueries({ queryKey: qk.currentUser });
      qc.invalidateQueries({ queryKey: qk.audit() });
      toast.success("Role updated");
    },
    onError: () => toast.error("Failed to update role"),
  });

  return (
    <SectionCard
      title="Users"
      description={canEdit ? "Change roles to control who can edit settings." : "Read-only — admin role required to change roles."}
    >
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-muted/40">
          <tr className="text-left">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Email</th>
            <th className="px-4 py-2.5 font-medium w-[220px]">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => {
            const isMe = u.id === currentUserId;
            return (
              <tr key={u.id} className="hover:bg-accent/40">
                <td className="px-4 py-2.5 text-sm">
                  <span className="inline-flex items-center gap-2">
                    {u.name}
                    {isMe && (
                      <span className="inline-flex items-center rounded border border-primary/20 bg-primary-soft px-1.5 h-4 text-[9.5px] font-medium uppercase tracking-wider text-primary">
                        You
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{u.email}</td>
                <td className="px-4 py-2.5">
                  {canEdit ? (
                    <Select
                      value={u.role}
                      onValueChange={(v) => m.mutate({ userId: u.id, role: v as Role })}
                      disabled={m.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coordinator">{ROLE_LABEL.coordinator}</SelectItem>
                        <SelectItem value="medical_director">{ROLE_LABEL.medical_director}</SelectItem>
                        <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs">{ROLE_LABEL[u.role]}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SectionCard>
  );
}
