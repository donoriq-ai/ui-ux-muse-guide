import { cn } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS } from "@/lib/api/types";
import type { DonorDocument, ExtractedField } from "@/lib/api/types";
import { Files } from "lucide-react";

export interface RailGroup {
  doc: DonorDocument;
  total: number;
  flagged: number;
  unreviewed: number;
}

export function DocumentRail({
  groups,
  totalAll,
  flaggedAll,
  selected,
  onSelect,
}: {
  groups: RailGroup[];
  totalAll: number;
  flaggedAll: number;
  selected: string; // "__all" or doc.id
  onSelect: (id: string) => void;
}) {
  const Item = ({
    id,
    label,
    total,
    flagged,
    icon,
  }: {
    id: string;
    label: string;
    total: number;
    flagged: number;
    icon?: React.ReactNode;
  }) => {
    const active = selected === id;
    return (
      <button
        type="button"
        onClick={() => onSelect(id)}
        className={cn(
          "group w-full text-left px-3 h-10 flex items-center gap-2 border-l-2 transition-colors",
          active
            ? "bg-surface-muted/70 border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:bg-surface-muted/40 hover:text-foreground",
        )}
      >
        {icon}
        <span className="flex-1 truncate text-[13px]">{label}</span>
        {flagged > 0 && (
          <span
            className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] font-medium bg-indeterminate-soft text-indeterminate-foreground border border-indeterminate/30 tabular-nums"
            title={`${flagged} flagged`}
          >
            {flagged}
          </span>
        )}
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums w-7 text-right">
          {total}
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Documents"
      className="rounded-md border border-border bg-surface overflow-hidden md:sticky md:top-4 self-start"
    >
      <div className="px-3 h-9 flex items-center border-b border-border bg-surface-muted/50">
        <span className="text-[10.5px] uppercase tracking-wider font-medium text-muted-foreground">
          Documents
        </span>
      </div>
      <div className="py-1">
        <Item
          id="__all"
          label="All documents"
          total={totalAll}
          flagged={flaggedAll}
          icon={<Files className="h-3.5 w-3.5" />}
        />
        <div className="my-1 border-t border-border" />
        {groups.map((g) => (
          <Item
            key={g.doc.id}
            id={g.doc.id}
            label={DOCUMENT_TYPE_LABELS[g.doc.type]}
            total={g.total}
            flagged={g.flagged}
          />
        ))}
      </div>
    </nav>
  );
}
