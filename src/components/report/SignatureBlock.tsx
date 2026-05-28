import type { Donor } from "@/lib/api/types";

export function SignatureBlock({ donor }: { donor: Donor }) {
  return (
    <section className="space-y-3 pt-2 report-avoid-break">
      <h2 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        Signatures
      </h2>
      <div className="grid sm:grid-cols-2 gap-6 pt-2">
        <SigLine
          role="Prepared by (Coordinator)"
          name={donor.createdBy}
          date={donor.createdAt}
        />
        <SigLine
          role="Reviewed by (Medical Director)"
          name={donor.reviewedBy ?? null}
          date={donor.reviewedAt ?? null}
        />
      </div>
    </section>
  );
}

function SigLine({
  role,
  name,
  date,
}: {
  role: string;
  name: string | null;
  date: string | null;
}) {
  return (
    <div className="space-y-1">
      <div className="border-b border-foreground/60 h-10 flex items-end pb-1 px-1 text-[12px] font-mono">
        {name ?? <span className="text-muted-foreground italic">Awaiting signature</span>}
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {role}
        </div>
        <div className="text-[10.5px] text-muted-foreground font-mono" suppressHydrationWarning>
          {date ? new Date(date).toLocaleDateString() : "—"}
        </div>
      </div>
    </div>
  );
}
