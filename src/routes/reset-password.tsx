import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormField } from "@/components/auth/FormField";
import * as api from "@/lib/api/mockApi";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — TissueQA" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const m = useMutation({
    mutationFn: () => api.resetPassword("demo-token", password),
    onSuccess: () => {
      toast.success("Password reset. Sign in with your new password.");
      navigate({ to: "/login" });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (password.length < 8) next.password = "Password must be at least 8 characters";
    if (confirm !== password) next.confirm = "Passwords do not match";
    setErrors(next);
    if (Object.keys(next).length === 0) m.mutate();
  };

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
          required
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />
        <Button type="submit" className="w-full h-9" disabled={m.isPending}>
          {m.isPending ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
