import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import * as api from "@/lib/api/client";
import { qk } from "@/lib/api/queries";
import type { Role, User } from "@/lib/api/types";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  user: "User",
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function UsersCard({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const qc = useQueryClient();

  const roleM = useMutation({
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
      description="Add users and control who can administer this tenant."
      action={<AddUserDialog />}
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
                  <Select
                    value={u.role}
                    onValueChange={(v) => roleM.mutate({ userId: u.id, role: v as Role })}
                    disabled={roleM.isPending}
                  >
                    <SelectTrigger className="h-8 text-xs w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{ROLE_LABEL.user}</SelectItem>
                      <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SectionCard>
  );
}

function AddUserDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setEmail("");
    setRole("user");
    setError(null);
  };

  const m = useMutation({
    mutationFn: () => api.createUser({ name, email, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.users });
      qc.invalidateQueries({ queryKey: qk.audit() });
      toast.success("User added");
      setOpen(false);
      reset();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Failed to add user"),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Enter the user's full name");
    if (!isEmail(email)) return setError("Enter a valid email address");
    setError(null);
    m.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a user in this tenant. A temporary password is generated; the user can reset it
            from the sign-in screen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Full name</Label>
            <Input
              id="new-user-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="new-user-role" className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{ROLE_LABEL.user}</SelectItem>
                <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-[12px] text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending ? "Adding…" : "Add user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
