import { useRef, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
  type TissueType,
} from "@/lib/api/types";
import type { DraftDocument } from "@/hooks/useDonorDraft";
import { cn } from "@/lib/utils";

const REQUIRED_BY_TISSUE: Record<TissueType, DocumentType[]> = {
  BT: [
    "authorization_consent",
    "drai",
    "birth_delivery_summary",
    "physical_assessment",
    "idt_report",
    "medical_records",
  ],
  MS: [
    "authorization_consent",
    "drai",
    "medical_records",
    "physical_assessment",
    "idt_report",
    "death_certificate",
    "recovery_timing_record",
  ],
};

interface Props {
  tissueType: TissueType;
  documents: DraftDocument[];
  onChange: (docs: DraftDocument[]) => void;
}

export function DocumentsStep({ tissueType, documents, onChange }: Props) {
  const required = REQUIRED_BY_TISSUE[tissueType];
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (files: File[]) => {
    const next = files.map<DraftDocument>((f) => ({
      type: "medical_records",
      fileName: f.name,
      pageCount: Math.max(1, Math.round(f.size / 50_000)),
    }));
    onChange([...documents, ...next]);
  };

  const updateDoc = (index: number, patch: Partial<DraftDocument>) => {
    onChange(documents.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const removeDoc = (index: number) => {
    onChange(documents.filter((_, i) => i !== index));
  };

  const haveTypes = new Set(documents.map((d) => d.type));

  return (
    <div className="space-y-5">
      <SectionCard
        title="Required documents"
        description={`Checklist for ${tissueType === "BT" ? "Birth Tissue" : "Musculoskeletal"} donors. You can attach now or after creating the donor.`}
      >
        <ul className="divide-y divide-border">
          {required.map((t) => {
            const have = haveTypes.has(t);
            return (
              <li
                key={t}
                className="flex items-center justify-between px-4 py-2.5 text-[12px]"
              >
                <span className="text-foreground">{DOCUMENT_TYPE_LABELS[t]}</span>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                    have
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {have ? "Attached" : "Pending"}
                </span>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard
        title="Attach files"
        description="Optional — drag PDFs or click to browse. Document type is editable per file."
      >
        <div className="p-4 space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "rounded-md border border-dashed p-6 text-center cursor-pointer transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/40",
            )}
          >
            <Upload className="mx-auto mb-2 text-muted-foreground" size={18} />
            <p className="text-[12px] text-foreground">Drop PDFs here</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              or click to browse
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
                e.target.value = "";
              }}
            />
          </div>

          {documents.length > 0 && (
            <ul className="space-y-2">
              {documents.map((d, i) => (
                <li
                  key={`${d.fileName}-${i}`}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
                >
                  <FileText size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-[12px] text-foreground truncate flex-1">
                    {d.fileName}
                  </span>
                  <Select
                    value={d.type}
                    onValueChange={(v) =>
                      updateDoc(i, { type: v as DocumentType })
                    }
                  >
                    <SelectTrigger className="h-7 text-[11px] w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-[12px]">
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDoc(i)}
                    className="h-7 w-7"
                  >
                    <X size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
