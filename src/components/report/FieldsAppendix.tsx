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
    <section className="space-y-4 report-break-before">
      <div>
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
          <div key={doc.id} className="space-y-2 report-avoid-break">
            <header className="flex items-baseline justify-between border-b border-border pb-1">
              <div className="text-[12px] font-medium">{DOCUMENT_TYPE_LABELS[doc.type]}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground">
                {doc.fileName} · {doc.pageCount}p
              </div>
            </header>

            {groups.map((g) => (
              <div key={g.key} className="space-y-1">
                {groups.length > 1 && (
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">
                    {g.label}
                  </div>
                )}
                <table className="w-full text-[11.5px] border border-border">
                  <tbody className="divide-y divide-border">
                    {g.fields.map((f) => {
                      const ref = citationRef(f.citation, docsById);
                      return (
                        <tr key={f.id}>
                          <td className="px-2 py-1 w-[40%] text-foreground/80">{f.label}</td>
                          <td className="px-2 py-1 font-mono">
                            {f.value ?? <span className="text-muted-foreground italic">—</span>}
                          </td>
                          <td className="px-2 py-1 w-[24%] text-right font-mono text-[10.5px] text-muted-foreground">
                            {ref ?? ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
