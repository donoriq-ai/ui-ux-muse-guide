import { createFileRoute } from "@tanstack/react-router";
import { Phase2Stub } from "@/components/Phase2Stub";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TissueQA" }] }),
  component: () => (
    <Phase2Stub
      title="Sign in"
      description="UI-only sign-in (sets the mock current user, routes to /donors). Built in Phase 2. Use the role switcher in the top bar for now."
      backTo="/donors"
      backLabel="Skip to app"
      fullscreen
    />
  ),
});
