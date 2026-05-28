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
        "inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2 h-6 text-[11px] font-semibold uppercase tracking-wider text-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      {expanded ? c.long : c.short}
    </span>
  );
}
