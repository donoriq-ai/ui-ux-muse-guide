import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { hasSession } from "@/lib/api/client";

export const Route = createFileRoute("/_authenticated")({
  // The authenticated app is entirely token-gated, and the JWT lives in
  // localStorage (client-only). Rendering this subtree on the server has no
  // token, so every data loader/suspense query would 401 and fall through to
  // notFound() on a hard refresh. Mark the whole subtree client-only so loaders
  // and queries run in the browser where the token exists. Child routes inherit
  // this setting.
  ssr: false,
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
