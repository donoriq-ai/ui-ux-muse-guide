import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { hasSession } from "@/lib/api/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    // SSR has no localStorage; skip the gate on the server and let the client
    // re-evaluate on hydration.
    if (typeof window === "undefined") return;
    if (!hasSession()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: () => <Outlet />,
});
