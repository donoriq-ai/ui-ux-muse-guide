import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormField } from "@/components/auth/FormField";
import * as api from '@/lib/api/client';
import { qk } from "@/lib/api/queries";

const search = z.object({
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TissueQA" }] }),
  validateSearch: search,
  beforeLoad: ({ search }) => {
    if (typeof window !== "undefined" && api.hasSession()) {
      throw redirect({ to: search.redirect ?? "/donors" });
    }
  },
  component: LoginPage,
});

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("coordinator@acme.dev");
  const [password, setPassword] = useState("dev-password");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const m = useMutation({
    mutationFn: () => api.login(email, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.currentUser });
      navigate({ to: redirectTo ?? "/donors" });
    },
    onError: (e) => setErrors({ form: e instanceof Error ? e.message : "Sign in failed" }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!isEmail(email)) next.email = "Enter a valid email address";
    if (password.length < 8) next.password = "Password must be at least 8 characters";
    setErrors(next);
    if (Object.keys(next).length === 0) m.mutate();
  };

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back. Sign in to review donor eligibility."
      footer={
        <>
          New to TissueQA?{" "}
          <Link to="/signup" className="text-primary hover:underline font-medium">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="f-password" className="block text-[12px] font-medium text-foreground">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[12px] text-primary hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <FormField
            label=""
            id="f-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
          />
        </div>

        {errors.form && (
          <p className="text-[12px] text-destructive" role="alert">
            {errors.form}
          </p>
        )}

        <Button type="submit" className="w-full h-9" disabled={m.isPending}>
          {m.isPending ? "Signing in…" : "Sign in"}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center pt-1">
          Demo prototype — any seeded email works. No real auth.
        </p>
      </form>
    </AuthCard>
  );
}
