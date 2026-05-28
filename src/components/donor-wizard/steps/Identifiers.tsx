import { FormField } from "@/components/auth/FormField";
import { SectionCard } from "@/components/SectionCard";
import { cn } from "@/lib/utils";
import type { TissueType } from "@/lib/api/types";

interface Props {
  id: string;
  tissueType: TissueType;
  error?: string;
  onChange: (patch: { id?: string; tissueType?: TissueType }) => void;
}

const TISSUE_OPTIONS: { value: TissueType; label: string; sub: string }[] = [
  { value: "BT", label: "Birth Tissue", sub: "Placenta, amnion, umbilical cord" },
  { value: "MS", label: "Musculoskeletal", sub: "Bone, tendon, fascia, cartilage" },
];

export function IdentifiersStep({ id, tissueType, error, onChange }: Props) {
  return (
    <div className="space-y-5">
      <SectionCard title="Donor identifier">
        <div className="p-4">
          <FormField
            label="Donor ID"
            value={id}
            onChange={(e) => onChange({ id: e.target.value })}
            error={error}
            hint="Auto-suggested from the next available sequence. You may override."
            placeholder="D-2026-XXXX"
            autoFocus
          />
        </div>
      </SectionCard>

      <SectionCard title="Tissue type" description="Drives the required document checklist on the workspace.">
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          {TISSUE_OPTIONS.map((opt) => {
            const active = tissueType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ tissueType: opt.value })}
                className={cn(
                  "text-left rounded-md border p-3 transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground">
                    {opt.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {opt.value}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{opt.sub}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
