import { cn } from "@/lib/utils";

export function ConfidenceMeter({
  value,
  threshold = 0.7,
  className,
}: {
  value: number;
  threshold?: number;
  className?: string;
}) {
  const pct = Math.round(value * 100);
  const low = value < threshold;
  return (
    <div className={cn("inline-flex items-center gap-2 min-w-[120px]", className)} aria-label={`Confidence ${pct}%`}>
      <div className="relative h-1.5 w-20 rounded-full bg-surface-muted overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all",
            low ? "bg-indeterminate" : "bg-accept",
          )}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-border-strong"
          style={{ left: `${threshold * 100}%` }}
          aria-hidden
          title={`Threshold ${Math.round(threshold * 100)}%`}
        />
      </div>
      <span
        className={cn(
          "font-mono text-[11px] tabular-nums w-9 text-right",
          low ? "text-indeterminate-foreground" : "text-muted-foreground",
        )}
      >
        {pct}%
      </span>
    </div>
  );
}
