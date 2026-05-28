import { createFileRoute } from "@tanstack/react-router";
import { Phase2Stub } from "@/components/Phase2Stub";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit — TissueQA" }] }),
  component: () => (
    <Phase2Stub
      title="Tenant audit trail"
      description="Tenant-wide filterable table of every audit entry. Built in Phase 2 — the per-donor audit view is live in the Donor Workspace today."
      backTo="/donors"
      backLabel="Back to donors"
    />
  ),
});
