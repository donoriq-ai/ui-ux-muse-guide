import { ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation, DonorDocument, ExtractedField } from "@/lib/api/types";
import {
  ExtractionFieldTable,
  type ExtractionDensity,
} from "./ExtractionFieldTable";

interface Props {
  id: string; // unique id for collapse persistence
  label: string;
  fields: ExtractedField[];
  collapsed: boolean;
  onToggle: () => void;
  density: ExtractionDensity;
  highlightQuery?: string;
  docsById: Map<string, DonorDocument>;
  showDocColumn?: boolean;
  pinned?: boolean; // visual emphasis for "Needs attention"
  onToggleField: (fieldId: string, v: boolean) => void;
  onOpenCitation: (c: Citation) => void;
}

export function ExtractionGroup({
  label,
  fields,
  collapsed,
  onToggle,
  density,
  highlightQuery,
  docsById,
  showDocColumn = false,
  pinned = false,
  onToggleField,
  onOpenCitation,
}: Props) {
  const flagged = fields.filter((f) => f.flaggedLowConfidence).length;
  const reviewed = fields.filter((f) => f.reviewed).length;
  const total = fields.length;
  const allReviewed = reviewed === total && total > 0;

  return (
    <section
      className={cn(
        "rounded-md border bg-card overflow-hidden",
        pinned ? "border-indeterminate/40" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-3 h-9 text-left border-b border-border bg-surface sticky top-0 z-10",
          pinned && "bg-indeterminate-soft/50",
        )}
      >
        <ChevronRight
          size={14}
          className={cn(
            "text-muted-foreground transition-transform shrink-0",
            !collapsed && "rotate-90",
          )}
        />
        {pinned && (
          <AlertCircle size={13} className="text-indeterminate-foreground shrink-0" />
        )}
        <span className="text-[12px] font-medium text-foreground tracking-wide">
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          · {total} field{total === 1 ? "" : "s"}
        </span>
        {flagged > 0 && !pinned && (
          <span className="inline-flex items-center gap-1 text-[10.5px] text-indeterminate-foreground">
            <AlertCircle size={11} /> {flagged} flagged
          </span>
        )}
        {allReviewed && !pinned && (
          <span className="text-[10.5px] text-accept">· all reviewed</span>
        )}
        <span className="ml-auto font-mono text-[10.5px] text-muted-foreground tabular-nums">
          {reviewed}/{total}
        </span>
      </button>

      {!collapsed && (
        <div className="p-0">
          <ExtractionFieldTable
            fields={fields}
            docsById={docsById}
            showDocColumn={showDocColumn}
            density={density}
            highlightQuery={highlightQuery}
            onToggle={onToggleField}
            onOpenCitation={onOpenCitation}
          />
        </div>
      )}
    </section>
  );
}
