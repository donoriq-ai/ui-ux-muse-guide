import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterChip({
  label,
  value,
  onClear,
  className,
}: {
  label: string;
  value: string;
  onClear: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded border border-border bg-surface text-xs",
        className,
      )}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label} filter`}
        className="grid place-items-center size-5 rounded hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:text-foreground"
      >
        <X size={12} />
      </button>
    </span>
  );
}
