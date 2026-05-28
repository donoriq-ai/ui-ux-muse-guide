import { cn } from "@/lib/utils";
import type { EvalState, CompletenessState } from "@/lib/api/types";
import { CheckCircle2, XCircle, AlertCircle, CircleHelp } from "lucide-react";

type Variant = EvalState | CompletenessState;

const config: Record<Variant, { label: string; classes: string; Icon: typeof CheckCircle2 }> = {
  ACCEPT: {
    label: "ACCEPT",
    classes: "bg-accept-soft text-accept border-accept/30",
    Icon: CheckCircle2,
  },
  REJECT: {
    label: "REJECT",
    classes: "bg-reject-soft text-reject border-reject/30",
    Icon: XCircle,
  },
  INDETERMINATE: {
    label: "INDETERMINATE",
    classes: "bg-indeterminate-soft text-indeterminate-foreground border-indeterminate/40",
    Icon: AlertCircle,
  },
  COMPLETE: {
    label: "COMPLETE",
    classes: "bg-accept-soft text-accept border-accept/30",
    Icon: CheckCircle2,
  },
  INCOMPLETE: {
    label: "INCOMPLETE",
    classes: "bg-indeterminate-soft text-indeterminate-foreground border-indeterminate/40",
    Icon: CircleHelp,
  },
};

interface StatusBadgeProps {
  state: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({ state, size = "md", className }: StatusBadgeProps) {
  const c = config[state];
  const sizes = {
    sm: "h-5 text-[10.5px] px-1.5 gap-1",
    md: "h-6 text-[11px] px-2 gap-1.5",
    lg: "h-8 text-xs px-3 gap-2 font-semibold",
  };
  const iconSize = { sm: 11, md: 13, lg: 15 }[size];
  return (
    <span
      role="status"
      aria-label={c.label}
      className={cn(
        "inline-flex items-center rounded border font-medium tracking-wider uppercase",
        sizes[size],
        c.classes,
        className,
      )}
    >
      <c.Icon size={iconSize} strokeWidth={2.4} aria-hidden />
      {c.label}
    </span>
  );
}
