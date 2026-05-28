import { Checkbox } from "@/components/ui/checkbox";
import { CitationChip } from "@/components/CitationChip";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS } from "@/lib/api/types";
import type { Citation, DonorDocument, ExtractedField } from "@/lib/api/types";

export type ExtractionDensity = "comfortable" | "compact";

function Highlight({ text, q }: { text: string; q?: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-primary/15 text-foreground rounded-sm px-0.5">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function ExtractionFieldTable({
  fields,
  docsById,
  showDocColumn,
  density = "comfortable",
  highlightQuery,
  onToggle,
  onOpenCitation,
}: {
  fields: ExtractedField[];
  docsById: Map<string, DonorDocument>;
  showDocColumn: boolean;
  density?: ExtractionDensity;
  highlightQuery?: string;
  onToggle: (fieldId: string, v: boolean) => void;
  onOpenCitation: (c: Citation) => void;
}) {
  if (fields.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface py-8 text-center text-[12px] text-muted-foreground">
        No fields match the current filters.
      </div>
    );
  }
  const compact = density === "compact";
  const cellY = compact ? "py-1" : "py-2";
  const fieldText = compact ? "text-[12px]" : "text-[13px]";
  const valueText = compact ? "text-[11.5px]" : "text-[12.5px]";

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="bg-surface-muted/60">
          <tr className="text-left">
            <th className={cn("px-3 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border w-[28%]", compact ? "h-8" : "h-9")}>
              Field
            </th>
            {showDocColumn && (
              <th className={cn("px-3 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border w-[18%]", compact ? "h-8" : "h-9")}>
                Document
              </th>
            )}
            <th className={cn("px-3 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border", compact ? "h-8" : "h-9")}>
              Value
            </th>
            <th className={cn("px-3 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border", compact ? "h-8 w-[110px]" : "h-9 w-[140px]")}>
              Confidence
            </th>
            <th className={cn("px-3 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border w-[200px]", compact ? "h-8" : "h-9")}>
              Source
            </th>
            <th className={cn("px-3 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border text-right w-[80px]", compact ? "h-8" : "h-9")}>
              Reviewed
            </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => {
            const flagged = f.flaggedLowConfidence;
            const doc = docsById.get(f.documentId);
            return (
              <tr key={f.id} className={cn("group", flagged && "bg-indeterminate-soft/30")}>
                <td className={cn("px-3 border-b border-border align-middle", cellY)}>
                  <div className={cn(fieldText, "font-medium text-foreground inline-flex items-center gap-1.5")}>
                    {flagged && (
                      <AlertCircle className="h-3 w-3 text-indeterminate-foreground" />
                    )}
                    <Highlight text={f.label} q={highlightQuery} />
                  </div>
                  {!compact && (
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{f.key}</div>
                  )}
                </td>
                {showDocColumn && (
                  <td className={cn("px-3 border-b border-border align-middle", cellY)}>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {doc ? DOCUMENT_TYPE_LABELS[doc.type] : "—"}
                    </span>
                  </td>
                )}
                <td className={cn("px-3 border-b border-border align-middle", cellY)}>
                  {f.value ? (
                    <span className={cn("font-mono", valueText)}>
                      <Highlight text={f.value} q={highlightQuery} />
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">— not extracted —</span>
                  )}
                </td>
                <td className={cn("px-3 border-b border-border align-middle", cellY)}>
                  <ConfidenceMeter value={f.confidence} className={compact ? "min-w-[96px]" : undefined} />
                </td>
                <td className={cn("px-3 border-b border-border align-middle", cellY)}>
                  <CitationChip citation={f.citation} onClick={onOpenCitation} />
                </td>
                <td className={cn("px-3 border-b border-border align-middle text-right", cellY)}>
                  <Checkbox
                    checked={f.reviewed}
                    onCheckedChange={(v) => onToggle(f.id, !!v)}
                    aria-label={`Mark ${f.label} reviewed`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
