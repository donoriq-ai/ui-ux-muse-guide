import { FileText } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { DOCUMENT_TYPE_LABELS, type TissueType } from "@/lib/api/types";
import type { PerDocFile } from "./Documents";

interface Props {
  id: string;
  tissueType: TissueType;
  uploadMode: "combined" | "per_doc";
  combinedFile: File | null;
  perDocFiles: PerDocFile[];
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 px-4 py-2 text-[12px]">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export function ReviewStep({ id, tissueType, uploadMode, combinedFile, perDocFiles }: Props) {
  const hasUpload =
    (uploadMode === "combined" && combinedFile !== null) ||
    (uploadMode === "per_doc" && perDocFiles.length > 0);

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
          !hasUpload
            ? "No files selected — you can upload from the workspace after creation."
            : uploadMode === "combined"
              ? "Combined packet will be uploaded and split into sections automatically."
              : `${perDocFiles.length} file${perDocFiles.length === 1 ? "" : "s"} ready to upload.`
        }
      >
        {uploadMode === "combined" && combinedFile && (
          <div className="px-4 py-3 flex items-center gap-2.5 text-[12px]">
            <FileText size={14} className="text-muted-foreground shrink-0" />
            <span className="text-foreground truncate">{combinedFile.name}</span>
            <span className="text-muted-foreground text-[11px] shrink-0">
              {(combinedFile.size / 1024 / 1024).toFixed(1)} MB · Combined packet
            </span>
          </div>
        )}

        {uploadMode === "per_doc" && perDocFiles.length > 0 && (
          <ul className="divide-y divide-border">
            {perDocFiles.map((d, i) => (
              <li
                key={`${d.file.name}-${i}`}
                className="flex items-center justify-between px-4 py-2 text-[12px]"
              >
                <span className="text-foreground truncate flex-1">{d.file.name}</span>
                <span className="text-muted-foreground text-[11px] shrink-0 ml-3">
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
