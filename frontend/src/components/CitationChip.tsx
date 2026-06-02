import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/api/types";
import { FileText } from "lucide-react";

interface CitationChipProps {
  citation: Citation | null;
  onClick?: (citation: Citation) => void;
  className?: string;
}

export function CitationChip({ citation, onClick, className }: CitationChipProps) {
  if (!citation) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 rounded border border-dashed border-border-strong bg-surface-muted px-2 h-6 font-mono text-[11px] text-muted-foreground",
        className,
      )}>
        <FileText size={11} aria-hidden />
        no source
      </span>
    );
  }
  const handler = onClick ? () => onClick(citation) : undefined;
  return (
    <button
      type="button"
      onClick={handler}
      disabled={!onClick}
      title={`${citation.documentLabel} · p.${citation.page}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2 h-6 font-mono text-[11px] text-foreground/80 hover:bg-accent hover:text-accent-foreground hover:border-primary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:hover:bg-surface disabled:hover:border-border",
        className,
      )}
    >
      <FileText size={11} aria-hidden className="shrink-0" />
      <span className="truncate max-w-[180px]">{citation.documentLabel}</span>
      <span className="text-muted-foreground">·</span>
      <span>p.{citation.page}</span>
    </button>
  );
}
