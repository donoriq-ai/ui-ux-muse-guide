import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormField } from "@/components/auth/FormField";
import * as api from '@/lib/api/client';

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — TissueQA" }] }),
  component: ForgotPasswordPage,
});

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  const m = useMutation({
    mutationFn: () => api.requestPasswordReset(email),
    onSuccess: () => setSent(true),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError(undefined);
    m.mutate();
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle={sent ? undefined : "Enter your email and we'll send you a reset link."}
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface-muted px-3 py-3 text-[13px] text-foreground">
            If an account exists for <span className="font-medium">{email}</span>, a reset
            link is on its way. Check your inbox.
          </div>
          <p className="text-[11px] text-muted-foreground">
            Demo prototype — no email is actually sent. Use the reset form directly to try
            it out.
          </p>
          <Button asChild variant="outline" className="w-full h-9">
            <Link to="/reset-password">Continue to reset form</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            required
          />
          <Button type="submit" className="w-full h-9" disabled={m.isPending}>
            {m.isPending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
