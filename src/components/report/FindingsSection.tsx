import type { Donor, DonorDocument, RuleFinding } from "@/lib/api/types";
import { StatusBadge } from "@/components/StatusBadge";
import { RuleChip } from "@/components/RuleChip";
import { citationRef } from "@/lib/report/citationRefs";

const SEVERITY_ORDER: RuleFinding["severity"][] = ["HARD", "GATE", "COND"];
const SEVERITY_LABEL: Record<RuleFinding["severity"], string> = {
  HARD: "Hard criteria",
  GATE: "Gating criteria",
  COND: "Conditional criteria",
};

export function FindingsSection({ donor }: { donor: Donor }) {
  if (!donor.evaluation) return null;
  const docsById = new Map(donor.documents.map((d) => [d.id, d as DonorDocument]));
  const groups = SEVERITY_ORDER.map((sev) => ({
    sev,
    items: donor.evaluation!.findings.filter((f) => f.severity === sev),
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <section className="space-y-4 report-break-before">
      <h2 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        Findings
      </h2>
      {groups.map((g) => (
        <div key={g.sev} className="space-y-2">
          <div className="text-[11px] font-medium text-foreground/80">
            {SEVERITY_LABEL[g.sev]} ({g.items.length})
          </div>
          <div className="space-y-2">
            {g.items.map((f) => (
              <FindingCard key={f.criterionId} finding={f} docsById={docsById} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function FindingCard({
  finding,
  docsById,
}: {
  finding: RuleFinding;
  docsById: Map<string, DonorDocument>;
}) {
  return (
    <div className="rounded border border-border bg-surface report-avoid-break">
      <header className="flex items-start justify-between gap-3 px-3 py-2 border-b border-border bg-surface-muted/50">
        <div className="min-w-0">
          <div className="text-[10px] font-mono text-muted-foreground">{finding.criterionId}</div>
          <div className="text-[13px] font-medium leading-tight mt-0.5">{finding.title}</div>
        </div>
        <StatusBadge state={finding.state} size="sm" />
      </header>

      <div className="px-3 py-2.5 space-y-2.5">
        <p className="text-[12px] text-foreground/85 leading-relaxed">{finding.reasoning}</p>

        {finding.inputs.length > 0 && (
          <table className="w-full text-[11.5px] border border-border">
            <thead className="bg-surface-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-1 font-medium w-[40%]">Input</th>
                <th className="text-left px-2 py-1 font-medium">Value</th>
                <th className="text-right px-2 py-1 font-medium w-[28%]">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {finding.inputs.map((inp, i) => {
                const ref = citationRef(inp.sourceCitation, docsById);
                return (
                  <tr key={i}>
                    <td className="px-2 py-1 text-foreground/80">{inp.label}</td>
                    <td className="px-2 py-1 font-mono">{inp.value ?? <span className="text-muted-foreground italic">missing</span>}</td>
                    <td className="px-2 py-1 text-right font-mono text-[10.5px] text-muted-foreground">
                      {ref ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {(finding.ruleCitation.aatb?.length || finding.ruleCitation.cfr?.length) && (
          <div className="pt-1">
            <RuleChip rule={finding.ruleCitation} />
          </div>
        )}
      </div>
    </div>
  );
}
