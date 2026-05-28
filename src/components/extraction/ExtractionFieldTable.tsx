import { Checkbox } from "@/components/ui/checkbox";
import { CitationChip } from "@/components/CitationChip";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS } from "@/lib/api/types";
import type { Citation, DonorDocument, ExtractedField } from "@/lib/api/types";

export function ExtractionFieldTable({
  fields,
  docsById,
  showDocColumn,
  onToggle,
  onOpenCitation,
}: {
  fields: ExtractedField[];
  docsById: Map<string, DonorDocument>;
  showDocColumn: boolean;
  onToggle: (fieldId: string, v: boolean) => void;
  onOpenCitation: (c: Citation) => void;
}) {
  if (fields.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface py-12 text-center text-sm text-muted-foreground">
        No fields match the current filters.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="bg-surface-muted/60">
          <tr className="text-left">
            <th className="px-3 h-9 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border w-[26%]">
              Field
            </th>
            {showDocColumn && (
              <th className="px-3 h-9 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border w-[18%]">
                Document
              </th>
            )}
            <th className="px-3 h-9 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
              Value
            </th>
            <th className="px-3 h-9 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border w-[140px]">
              Confidence
            </th>
            <th className="px-3 h-9 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border w-[220px]">
              Source
            </th>
            <th className="px-3 h-9 font-medium text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border text-right w-[90px]">
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
                <td className="px-3 py-2 border-b border-border align-middle">
                  <div className="text-[13px] font-medium text-foreground inline-flex items-center gap-1.5">
                    {flagged && (
                      <AlertCircle className="h-3 w-3 text-indeterminate-foreground" />
                    )}
                    {f.label}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{f.key}</div>
                </td>
                {showDocColumn && (
                  <td className="px-3 py-2 border-b border-border align-middle">
                    <span className="text-[11px] text-muted-foreground truncate">
                      {doc ? DOCUMENT_TYPE_LABELS[doc.type] : "—"}
                    </span>
                  </td>
                )}
                <td className="px-3 py-2 border-b border-border align-middle">
                  {f.value ? (
                    <span className="font-mono text-[12.5px]">{f.value}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">— not extracted —</span>
                  )}
                </td>
                <td className="px-3 py-2 border-b border-border align-middle">
                  <ConfidenceMeter value={f.confidence} />
                </td>
                <td className="px-3 py-2 border-b border-border align-middle">
                  <CitationChip citation={f.citation} onClick={onOpenCitation} />
                </td>
                <td className="px-3 py-2 border-b border-border align-middle text-right">
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
