import { useMemo } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOCUMENT_TYPE_LABELS } from "@/lib/api/types";
import type {
  Citation,
  DonorDocument,
  ExtractedField,
} from "@/lib/api/types";
import { groupFieldsForDoc } from "@/lib/extraction/grouping";
import { ExtractionGroup } from "./ExtractionGroup";
import type { ExtractionDensity } from "./ExtractionFieldTable";

interface Props {
  doc: DonorDocument;
  fields: ExtractedField[];
  docsById: Map<string, DonorDocument>;
  density: ExtractionDensity;
  highlightQuery?: string;
  filterActive: boolean; // when true, force-expand all groups
  isCollapsed: (id: string, defaultCollapsed: boolean) => boolean;
  toggle: (id: string, defaultCollapsed: boolean) => void;
  setAll: (ids: string[], collapsed: boolean) => void;
  showDocHeader?: boolean; // shown in "All documents" stacked layout
  onToggleField: (fieldId: string, v: boolean) => void;
  onOpenCitation: (c: Citation) => void;
}

export function DocumentExtractionPanel({
  doc,
  fields,
  docsById,
  density,
  highlightQuery,
  filterActive,
  isCollapsed,
  toggle,
  setAll,
  showDocHeader = false,
  onToggleField,
  onOpenCitation,
}: Props) {
  const groups = useMemo(() => groupFieldsForDoc(fields, doc.type), [fields, doc.type]);
  const attention = useMemo(
    () => fields.filter((f) => f.flaggedLowConfidence || !f.reviewed),
    [fields],
  );

  if (fields.length === 0) return null;

  const groupIds = groups.map((g) => `${doc.id}:${g.key}`);
  const attentionId = `${doc.id}:__attention`;
  const allIds = [attentionId, ...groupIds];

  return (
    <div className="space-y-3">
      {showDocHeader && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <FileText size={13} className="text-muted-foreground shrink-0" />
            <span className="text-[12px] font-medium text-foreground truncate">
              {DOCUMENT_TYPE_LABELS[doc.type]}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono truncate">
              · {doc.fileName} · {doc.pageCount}p
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-muted-foreground"
              onClick={() => setAll(allIds, false)}
            >
              Expand all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-muted-foreground"
              onClick={() => setAll(allIds, true)}
            >
              Collapse all
            </Button>
          </div>
        </div>
      )}

      {/* Pinned "Needs attention" */}
      {attention.length > 0 && (
        <ExtractionGroup
          id={attentionId}
          label="Needs attention"
          fields={attention}
          collapsed={filterActive ? false : isCollapsed(attentionId, false)}
          onToggle={() => toggle(attentionId, false)}
          density={density}
          highlightQuery={highlightQuery}
          docsById={docsById}
          pinned
          onToggleField={onToggleField}
          onOpenCitation={onOpenCitation}
        />
      )}

      {groups.map((g) => {
        const id = `${doc.id}:${g.key}`;
        const hasIssue =
          g.fields.some((f) => f.flaggedLowConfidence) ||
          g.fields.some((f) => !f.reviewed);
        // Default: expand groups with issues; collapse fully-reviewed/clean groups.
        const defaultCollapsed = !hasIssue;
        const collapsed = filterActive ? false : isCollapsed(id, defaultCollapsed);
        return (
          <ExtractionGroup
            key={id}
            id={id}
            label={g.label}
            fields={g.fields}
            collapsed={collapsed}
            onToggle={() => toggle(id, defaultCollapsed)}
            density={density}
            highlightQuery={highlightQuery}
            docsById={docsById}
            onToggleField={onToggleField}
            onOpenCitation={onOpenCitation}
          />
        );
      })}
    </div>
  );
}
