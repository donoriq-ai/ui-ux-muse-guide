import { useRef, useState } from "react";
import { Upload, X, FileText, CheckCircle2 } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOCUMENT_TYPE_LABELS, type DocumentType, type TissueType } from "@/lib/api/types";
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

export interface PerDocFile {
  type: DocumentType;
  file: File;
}

interface Props {
  tissueType: TissueType;
  // mode + combined
  mode: "combined" | "per_doc";
  onModeChange: (m: "combined" | "per_doc") => void;
  combinedFile: File | null;
  onCombinedFileChange: (f: File | null) => void;
  // per-doc
  perDocFiles: PerDocFile[];
  onPerDocFilesChange: (files: PerDocFile[]) => void;
}

export function DocumentsStep({
  tissueType,
  mode,
  onModeChange,
  combinedFile,
  onCombinedFileChange,
  perDocFiles,
  onPerDocFilesChange,
}: Props) {
  const required = REQUIRED_BY_TISSUE[tissueType];
  const combinedRef = useRef<HTMLInputElement>(null);
  const perDocRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [perDocType, setPerDocType] = useState<DocumentType>("medical_records");

  const coveredTypes = new Set(perDocFiles.map((d) => d.type));

  const addPerDocFiles = (files: File[]) => {
    const next: PerDocFile[] = files.map((f) => ({ type: perDocType, file: f }));
    onPerDocFilesChange([...perDocFiles, ...next]);
  };

  const updatePerDocType = (index: number, type: DocumentType) => {
    onPerDocFilesChange(perDocFiles.map((d, i) => (i === index ? { ...d, type } : d)));
  };

  const removePerDoc = (index: number) => {
    onPerDocFilesChange(perDocFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-md">
        <button
          type="button"
          onClick={() => onModeChange("combined")}
          className={cn(
            "h-8 text-xs font-medium rounded transition-colors",
            mode === "combined"
              ? "bg-background border border-border text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Combined packet
        </button>
        <button
          type="button"
          onClick={() => onModeChange("per_doc")}
          className={cn(
            "h-8 text-xs font-medium rounded transition-colors",
            mode === "per_doc"
              ? "bg-background border border-border text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Per document
        </button>
      </div>

      {/* Combined mode */}
      {mode === "combined" && (
        <SectionCard
          title="Combined donor packet"
          description="Upload one PDF containing all documents. Reducto will automatically split it into sections."
        >
          <div className="p-4 space-y-3">
            {combinedFile ? (
              <div className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2.5">
                <CheckCircle2 size={15} className="text-success shrink-0" />
                <span className="text-[12px] text-foreground truncate flex-1">
                  {combinedFile.name}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {(combinedFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => {
                    onCombinedFileChange(null);
                    if (combinedRef.current) combinedRef.current.value = "";
                  }}
                >
                  <X size={13} />
                </Button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) onCombinedFileChange(f);
                }}
                onClick={() => combinedRef.current?.click()}
                className={cn(
                  "rounded-md border border-dashed p-8 text-center cursor-pointer transition-colors",
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                )}
              >
                <Upload className="mx-auto mb-2 text-muted-foreground" size={18} />
                <p className="text-[12px] text-foreground font-medium">
                  Drop combined donor packet (PDF)
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  or click to browse — sections split automatically
                </p>
              </div>
            )}
            <input
              ref={combinedRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onCombinedFileChange(f);
                e.target.value = "";
              }}
            />
          </div>
        </SectionCard>
      )}

      {/* Per-document mode */}
      {mode === "per_doc" && (
        <SectionCard
          title="Attach files"
          description="Upload one PDF per document type. Set the type for each file."
        >
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-muted-foreground shrink-0">
                Type for next upload
              </label>
              <Select value={perDocType} onValueChange={(v) => setPerDocType(v as DocumentType)}>
                <SelectTrigger className="h-7 text-[11px] flex-1">
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
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addPerDocFiles(Array.from(e.dataTransfer.files));
              }}
              onClick={() => perDocRef.current?.click()}
              className={cn(
                "rounded-md border border-dashed p-6 text-center cursor-pointer transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
              )}
            >
              <Upload className="mx-auto mb-2 text-muted-foreground" size={16} />
              <p className="text-[12px] text-foreground">Drop PDFs here</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">or click to browse</p>
            </div>
            <input
              ref={perDocRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addPerDocFiles(Array.from(e.target.files));
                e.target.value = "";
              }}
            />

            {perDocFiles.length > 0 && (
              <ul className="space-y-2">
                {perDocFiles.map((d, i) => (
                  <li
                    key={`${d.file.name}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
                  >
                    <FileText size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-[12px] text-foreground truncate flex-1">
                      {d.file.name}
                    </span>
                    <Select
                      value={d.type}
                      onValueChange={(v) => updatePerDocType(i, v as DocumentType)}
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
                      onClick={() => removePerDoc(i)}
                      className="h-7 w-7 shrink-0"
                    >
                      <X size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      )}

      {/* Per-doc only: checklist is accurate because each file has an explicit type */}
      {mode === "per_doc" && (
        <SectionCard
          title="Required documents"
          description={`Checklist for ${tissueType === "BT" ? "Birth Tissue" : "Musculoskeletal"} donors.`}
        >
          <ul className="divide-y divide-border">
            {required.map((t) => {
              const have = coveredTypes.has(t);
              return (
                <li key={t} className="flex items-center justify-between px-4 py-2.5 text-[12px]">
                  <span className="text-foreground">{DOCUMENT_TYPE_LABELS[t]}</span>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                      have ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {have ? "Attached" : "Pending"}
                  </span>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
