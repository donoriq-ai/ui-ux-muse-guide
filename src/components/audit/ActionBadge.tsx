import { cn } from "@/lib/utils";
import { categoryOf, CATEGORY_CLASSES, CATEGORY_LABELS } from "@/lib/audit/categories";

export function ActionBadge({ action, className }: { action: string; className?: string }) {
  const cat = categoryOf(action);
  const subAction = action.includes(".") ? action.split(".").slice(1).join(".") : action;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border h-5 px-1.5 text-[10.5px] font-medium",
        CATEGORY_CLASSES[cat],
        className,
      )}
      title={action}
    >
      <span className="uppercase tracking-wider text-[9px] font-semibold opacity-75">
        {CATEGORY_LABELS[cat]}
      </span>
      <span className="font-mono">{subAction}</span>
    </span>
  );
}
