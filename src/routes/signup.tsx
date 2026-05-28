import { createFileRoute } from "@tanstack/react-router";
import { Phase2Stub } from "@/components/Phase2Stub";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — TissueQA" }] }),
  component: () => (
    <Phase2Stub
      title="Sign up"
      description="UI-only sign-up. Built in Phase 2."
      backTo="/donors"
      backLabel="Skip to app"
      fullscreen
    />
  ),
});
