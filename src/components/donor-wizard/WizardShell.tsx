import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stepper, type StepDef } from "./Stepper";

interface WizardShellProps {
  steps: StepDef[];
  current: number;
  onStepClick?: (i: number) => void;
  title: string;
  description?: string;
  children: ReactNode;
  // footer controls
  onBack?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextPending?: boolean;
  hideBack?: boolean;
}

export function WizardShell({
  steps,
  current,
  onStepClick,
  title,
  description,
  children,
  onBack,
  onNext,
  onCancel,
  nextLabel = "Continue",
  nextDisabled,
  nextPending,
  hideBack,
}: WizardShellProps) {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)]">
      <header className="px-6 py-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3 mb-3">
          <Link
            to="/donors"
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={14} />
            Donors
          </Link>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-[12px] text-foreground">New donor</span>
        </div>
        <Stepper steps={steps} current={current} onStepClick={onStepClick} />
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-5">
            <h1 className="text-[15px] font-medium text-foreground">{title}</h1>
            {description && (
              <p className="text-[12px] text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {children}
        </div>
      </main>

      <footer className="px-6 py-3 border-t border-border bg-surface flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 text-[12px]"
        >
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {!hideBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              disabled={!onBack}
              className="h-8 text-[12px]"
            >
              Back
            </Button>
          )}
          <Button
            size="sm"
            onClick={onNext}
            disabled={nextDisabled || nextPending}
            className="h-8 text-[12px] min-w-[96px]"
          >
            {nextPending ? "Working…" : nextLabel}
          </Button>
        </div>
      </footer>
    </div>
  );
}
