import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { donorQuery, tenantQuery } from "@/lib/api/queries";
import { ReportShell } from "@/components/report/ReportShell";
import { ReportHeader } from "@/components/report/ReportHeader";
import { EligibilitySummary } from "@/components/report/EligibilitySummary";
import { FindingsSection } from "@/components/report/FindingsSection";
import { CompletenessSection } from "@/components/report/CompletenessSection";
import { FieldsAppendix } from "@/components/report/FieldsAppendix";
import { SignatureBlock } from "@/components/report/SignatureBlock";

export const Route = createFileRoute("/_authenticated/donors/$id/report")({
  head: ({ params }) => ({ meta: [{ title: `Donor Report — ${params.id}` }] }),
  loader: async ({ params, context }) => {
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(donorQuery(params.id)),
        context.queryClient.ensureQueryData(tenantQuery()),
      ]);
    } catch {
      throw notFound();
    }
  },
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const { data: donor } = useSuspenseQuery(donorQuery(id));
  const { data: tenant } = useSuspenseQuery(tenantQuery());

  return (
    <ReportShell donorId={donor.id}>
      <ReportHeader donor={donor} tenant={tenant} />
      <EligibilitySummary donor={donor} />
      <FindingsSection donor={donor} />
      <CompletenessSection donor={donor} />
      <FieldsAppendix donor={donor} />
      <SignatureBlock donor={donor} />

      <footer className="pt-4 mt-4 border-t border-border flex items-baseline justify-between text-[10px] text-muted-foreground font-mono">
        <span>{donor.id}</span>
        <span>{donor.evaluation?.rulesetVersion ?? "—"}</span>
        <span>{tenant.name}</span>
      </footer>
    </ReportShell>
  );
}
