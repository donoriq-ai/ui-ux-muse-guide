import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormField } from "@/components/auth/FormField";
import * as api from '@/lib/api/client';
import { qk } from "@/lib/api/queries";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — TissueQA" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && api.hasSession()) {
      throw redirect({ to: "/donors" });
    }
  },
  component: SignupPage,
});

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function SignupPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});

  const m = useMutation({
    mutationFn: () => api.signup({ email, name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.currentUser });
      navigate({ to: "/donors" });
    },
    onError: (e) => setErrors({ form: e instanceof Error ? e.message : "Sign up failed" }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Enter your full name";
    if (!isEmail(email)) next.email = "Enter a valid email address";
    if (password.length < 8) next.password = "Password must be at least 8 characters";
    setErrors(next);
    if (Object.keys(next).length === 0) m.mutate();
  };

  return (
    <AuthCard
      title="Create an account"
      subtitle="Start reviewing donor eligibility in your tenant."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField
          label="Full name"
          autoComplete="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
          required
        />

        {errors.form && (
          <p className="text-[12px] text-destructive" role="alert">
            {errors.form}
          </p>
        )}

        <Button type="submit" className="w-full h-9" disabled={m.isPending}>
          {m.isPending ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center pt-1">
          Demo prototype — accounts live in memory only.
        </p>
      </form>
    </AuthCard>
  );
}
