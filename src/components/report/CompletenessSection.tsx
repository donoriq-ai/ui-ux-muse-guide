import type { Donor } from "@/lib/api/types";
import { DOCUMENT_TYPE_LABELS } from "@/lib/api/types";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export function CompletenessSection({ donor }: { donor: Donor }) {
  const items = donor.evaluation?.completeness.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="space-y-3 report-avoid-break">
      <h2 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        Completeness checklist
      </h2>
      <table className="w-full text-[12px] border border-border">
        <thead className="bg-surface-muted/40 text-muted-foreground text-[11px]">
          <tr>
            <th className="text-left px-3 py-1.5 font-medium">Requirement</th>
            <th className="text-left px-3 py-1.5 font-medium w-[35%]">Document</th>
            <th className="text-left px-3 py-1.5 font-medium w-[22%]">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((it, i) => (
            <tr key={i}>
              <td className="px-3 py-1.5">{it.requirement}</td>
              <td className="px-3 py-1.5 text-muted-foreground">
                {it.documentType ? DOCUMENT_TYPE_LABELS[it.documentType] : "—"}
              </td>
              <td className="px-3 py-1.5">
                <StatusPill status={it.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function StatusPill({ status }: { status: "present" | "missing" | "low_confidence" }) {
  if (status === "present") {
    return (
      <span className="inline-flex items-center gap-1 text-accept text-[11px] font-medium">
        <CheckCircle2 className="h-3 w-3" /> Present
      </span>
    );
  }
  if (status === "missing") {
    return (
      <span className="inline-flex items-center gap-1 text-reject text-[11px] font-medium">
        <XCircle className="h-3 w-3" /> Missing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-indeterminate-foreground text-[11px] font-medium">
      <AlertCircle className="h-3 w-3" /> Low confidence
    </span>
  );
}
