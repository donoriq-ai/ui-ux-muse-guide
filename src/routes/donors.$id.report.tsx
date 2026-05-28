import { createFileRoute } from "@tanstack/react-router";
import { Phase2Stub } from "@/components/Phase2Stub";

export const Route = createFileRoute("/donors/$id/report")({
  head: ({ params }) => ({ meta: [{ title: `Report — ${params.id}` }] }),
  component: ReportStub,
});

function ReportStub() {
  const { id } = Route.useParams();
  return (
    <Phase2Stub
      title={`Report — ${id}`}
      description="Print-friendly A4 summary: donor header, completeness, recommendation with findings + citations, extracted fields, ruleset version, signature block. Built in Phase 2."
      backTo="/donors/$id"
      backParams={{ id }}
      backLabel="Back to workspace"
    />
  );
}
