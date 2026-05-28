import { SectionCard } from "@/components/SectionCard";
import { DOCUMENT_TYPE_LABELS, type DocumentType, type TissueType } from "@/lib/api/types";
import type { DraftDocument } from "@/hooks/useDonorDraft";

interface Props {
  id: string;
  tissueType: TissueType;
  documents: DraftDocument[];
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 px-4 py-2 text-[12px]">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export function ReviewStep({ id, tissueType, documents }: Props) {
  const byType = new Map<DocumentType, number>();
  documents.forEach((d) => byType.set(d.type, (byType.get(d.type) ?? 0) + 1));

  return (
    <div className="space-y-5">
      <SectionCard title="Donor">
        <div className="divide-y divide-border">
          <Row label="Donor ID" value={<span className="font-mono">{id}</span>} />
          <Row
            label="Tissue type"
            value={tissueType === "BT" ? "Birth Tissue (BT)" : "Musculoskeletal (MS)"}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Initial documents"
        description={
          documents.length === 0
            ? "No files attached — you can upload from the workspace after creation."
            : `${documents.length} file${documents.length === 1 ? "" : "s"} ready to attach.`
        }
      >
        {documents.length > 0 && (
          <ul className="divide-y divide-border">
            {documents.map((d, i) => (
              <li
                key={`${d.fileName}-${i}`}
                className="flex items-center justify-between px-4 py-2 text-[12px]"
              >
                <span className="text-foreground truncate">{d.fileName}</span>
                <span className="text-muted-foreground text-[11px]">
                  {DOCUMENT_TYPE_LABELS[d.type]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
