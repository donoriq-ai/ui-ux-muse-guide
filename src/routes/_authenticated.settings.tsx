import { createFileRoute } from "@tanstack/react-router";
import { Phase2Stub } from "@/components/Phase2Stub";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — TissueQA" }] }),
  component: () => (
    <Phase2Stub
      title="Tenant settings"
      description="Tenant name, users table, confidence threshold slider, BT gestational-age policy. Admin-only. Built in Phase 2."
      backTo="/donors"
      backLabel="Back to donors"
    />
  ),
});
