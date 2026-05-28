import type { Donor } from "@/lib/api/types";
import { StatusBadge } from "@/components/StatusBadge";

export function EligibilitySummary({ donor }: { donor: Donor }) {
  const ev = donor.evaluation;
  if (!ev) {
    return (
      <section className="space-y-2">
        <SectionTitle>Eligibility summary</SectionTitle>
        <div className="rounded border border-dashed border-border bg-surface-muted/40 p-4 text-[12px] text-muted-foreground">
          Evaluation pending. Upload documents and run extraction to produce a recommendation.
        </div>
      </section>
    );
  }

  const findings = ev.findings;
  const fail = findings.filter((f) => f.state === "REJECT").length;
  const indet = findings.filter((f) => f.state === "INDETERMINATE").length;
  const pass = findings.filter((f) => f.state === "ACCEPT").length;

  const items = ev.completeness.items;
  const present = items.filter((i) => i.status === "present").length;
  const missing = items.filter((i) => i.status === "missing").length;
  const low = items.filter((i) => i.status === "low_confidence").length;

  const headline =
    ev.recommendation === "ACCEPT"
      ? "All applicable criteria passed."
      : ev.recommendation === "REJECT"
        ? `Donor rejected — ${fail} criterion${fail === 1 ? "" : "a"} failed.`
        : `Indeterminate — ${indet} criterion${indet === 1 ? "" : "a"} require manual review.`;

  return (
    <section className="space-y-3">
      <SectionTitle>Eligibility summary</SectionTitle>
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
        <div className="space-y-2">
          <div className="text-[13px] font-medium">{headline}</div>
          <div className="text-[12px] text-muted-foreground">
            {pass} passed · {indet} indeterminate · {fail} failed across {findings.length} evaluated criteria.
          </div>
        </div>
        <StatusBadge state={ev.recommendation} size="lg" />
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2">
        <Stat label="Documents present" value={present} total={items.length} />
        <Stat label="Missing" value={missing} tone={missing > 0 ? "warn" : "ok"} />
        <Stat label="Low confidence" value={low} tone={low > 0 ? "warn" : "ok"} />
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
      {children}
    </h2>
  );
}

function Stat({
  label,
  value,
  total,
  tone = "ok",
}: {
  label: string;
  value: number;
  total?: number;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded border border-border bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className={
          "mt-0.5 text-[15px] font-mono tabular-nums " +
          (tone === "warn" ? "text-indeterminate-foreground" : "text-foreground")
        }
      >
        {value}
        {total !== undefined && (
          <span className="text-muted-foreground text-[12px]"> / {total}</span>
        )}
      </div>
    </div>
  );
}
