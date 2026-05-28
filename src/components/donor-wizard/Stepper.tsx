import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
  key: string;
  label: string;
}

export function Stepper({
  steps,
  current,
  onStepClick,
}: {
  steps: StepDef[];
  current: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = i < current && !!onStepClick;
        return (
          <li key={s.key} className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded-md text-[12px] transition-colors",
                clickable && "hover:bg-muted",
                !clickable && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center size-5 rounded-full border text-[11px] font-medium shrink-0",
                  done && "bg-primary text-primary-foreground border-primary",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={cn(
                  "truncate",
                  active ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span aria-hidden className="w-6 h-px bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
