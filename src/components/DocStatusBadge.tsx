import { cn } from "@/lib/utils";

type DocStatus = "processing" | "extracted" | "error";

const styles: Record<DocStatus, string> = {
  extracted: "border-accept/30 bg-accept-soft text-accept",
  processing: "border-indeterminate/40 bg-indeterminate-soft text-indeterminate-foreground",
  error: "border-reject/30 bg-reject-soft text-reject",
};

export function DocStatusBadge({ status, className }: { status: DocStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 h-5 text-[10px] font-medium uppercase tracking-wider",
        styles[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
