import { cn } from "@/lib/utils";
import type { TissueType } from "@/lib/api/types";

const labelMap: Record<TissueType, { short: string; long: string }> = {
  BT: { short: "BT", long: "Birth Tissue" },
  MS: { short: "MS", long: "Musculoskeletal" },
};

export function TissueTypeBadge({
  type,
  expanded = false,
  className,
}: {
  type: TissueType;
  expanded?: boolean;
  className?: string;
}) {
  const c = labelMap[type];
  return (
    <span
      title={c.long}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-border bg-surface px-1.5 h-5 text-[10.5px] font-medium uppercase tracking-wider text-foreground/80",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      {expanded ? c.long : c.short}
    </span>
  );
}
