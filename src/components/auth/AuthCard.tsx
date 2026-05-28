import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="px-6 py-5">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <span className="grid place-items-center size-7 rounded bg-primary text-primary-foreground">
            <Activity size={15} strokeWidth={2.4} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-medium text-sm text-foreground">TissueQA</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Donor review
            </span>
          </span>
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-4 pb-16">
        <div className="w-full max-w-[380px]">
          <div className="rounded-lg border border-border bg-card p-6 sm:p-7">
            <div className="space-y-1 mb-5">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[13px] text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
          {footer && (
            <div className="mt-4 text-center text-[13px] text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
