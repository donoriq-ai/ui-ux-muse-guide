import type { Donor, DonorDocument } from "@/lib/api/types";
import { DOCUMENT_TYPE_LABELS } from "@/lib/api/types";
import { groupFieldsForDoc } from "@/lib/extraction/grouping";
import { citationRef } from "@/lib/report/citationRefs";

export function FieldsAppendix({ donor }: { donor: Donor }) {
  if (donor.fields.length === 0) return null;
  const docsById = new Map(donor.documents.map((d) => [d.id, d as DonorDocument]));

  const docsWithFields = donor.documents
    .map((doc) => ({ doc, fields: donor.fields.filter((f) => f.documentId === doc.id) }))
    .filter((d) => d.fields.length > 0);

  return (
    <section className="space-y-6 report-break-before">
      <div className="report-avoid-break">
        <h2 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          Appendix · Extracted fields
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Full record of values extracted from source documents.
        </p>
      </div>

      {docsWithFields.map(({ doc, fields }) => {
        const groups = groupFieldsForDoc(fields, doc.type);
        return (
          <div key={doc.id} className="space-y-3">
            <header className="flex items-baseline justify-between border-b border-border pb-1 report-avoid-break">
              <div className="text-[12px] font-medium">{DOCUMENT_TYPE_LABELS[doc.type]}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground">
                {doc.fileName} · {doc.pageCount}p
              </div>
            </header>

            {groups.map((g) => {
              const showHeader =
                !(groups.length === 1 && (g.key === "fields" || g.key === "other"));
              return (
                <div key={g.key} className="space-y-1 report-avoid-break">
                  {showHeader && (
                    <div className="flex items-baseline justify-between">
                      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">
                        {g.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {g.fields.length} {g.fields.length === 1 ? "field" : "fields"}
                      </div>
                    </div>
                  )}
                  <table className="w-full text-[11.5px] border border-border table-fixed">
                    <thead className="bg-surface-muted/40 text-muted-foreground text-[10.5px]">
                      <tr>
                        <th className="text-left px-2 py-1 font-medium w-[40%]">Field</th>
                        <th className="text-left px-2 py-1 font-medium">Value</th>
                        <th className="text-right px-2 py-1 font-medium w-[22%]">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {g.fields.map((f) => {
                        const ref = citationRef(f.citation, docsById);
                        return (
                          <tr key={f.id} className="align-top">
                            <td className="px-2 py-1 text-foreground/80">{f.label}</td>
                            <td className="px-2 py-1 font-mono tabular-nums break-words">
                              {f.value ?? <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-2 py-1 text-right font-mono text-[10.5px] text-muted-foreground">
                              {ref ?? ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
