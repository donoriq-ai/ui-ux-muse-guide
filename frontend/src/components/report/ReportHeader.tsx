import type { Donor, Tenant } from "@/lib/api/types";
import { StatusBadge } from "@/components/StatusBadge";
import { TissueTypeBadge } from "@/components/TissueTypeBadge";

export function ReportHeader({ donor, tenant }: { donor: Donor; tenant: Tenant }) {
  const now = new Date();
  return (
    <header className="space-y-4 pb-6 border-b border-border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            {tenant.name}
          </div>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Donor Eligibility Report</h1>
        </div>
        <div className="text-right text-[11px] text-muted-foreground space-y-0.5">
          <div suppressHydrationWarning>
            Generated {now.toLocaleDateString()} {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          {donor.evaluation && (
            <div>
              Ruleset <span className="font-mono text-foreground/80">{donor.evaluation.rulesetVersion}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        <Meta label="Donor ID" value={<span className="font-mono">{donor.id}</span>} />
        <Meta
          label="Tissue type"
          value={<TissueTypeBadge type={donor.tissueType} expanded />}
        />
        <Meta
          label="Created"
          value={
            <span suppressHydrationWarning>
              {new Date(donor.createdAt).toLocaleDateString()} · {donor.createdBy}
            </span>
          }
        />
        <Meta
          label="Reviewed"
          value={
            donor.reviewedBy ? (
              <span suppressHydrationWarning>
                {donor.reviewedAt
                  ? new Date(donor.reviewedAt).toLocaleDateString()
                  : "—"}{" "}
                · {donor.reviewedBy}
              </span>
            ) : (
              <span className="text-muted-foreground">Pending</span>
            )
          }
        />
      </div>

      {donor.evaluation && (
        <div className="flex items-center gap-3 pt-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Recommendation
          </span>
          <StatusBadge state={donor.evaluation.recommendation} size="lg" />
          <StatusBadge state={donor.evaluation.completeness.state} size="md" />
        </div>
      )}
    </header>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="text-[12px] text-foreground">{value}</div>
    </div>
  );
}
