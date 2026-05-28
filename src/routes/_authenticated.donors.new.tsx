import { createFileRoute } from "@tanstack/react-router";
import { Phase2Stub } from "@/components/Phase2Stub";

export const Route = createFileRoute("/_authenticated/donors/new")({
  head: () => ({ meta: [{ title: "New donor — TissueQA" }] }),
  component: () => (
    <Phase2Stub
      title="Create donor"
      description="Donor ID + auto-generate, tissue type selector, 'Create & continue' → workspace. Wiring planned for Phase 2."
      backTo="/donors"
      backLabel="Back to donors"
    />
  ),
});
