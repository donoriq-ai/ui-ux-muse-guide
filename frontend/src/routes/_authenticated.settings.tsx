import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { currentUserQuery, settingsQuery } from "@/lib/api/queries";
import { ProfileCard } from "@/components/settings/ProfileCard";
import { OrganizationCard } from "@/components/settings/OrganizationCard";
import { ThresholdsCard } from "@/components/settings/ThresholdsCard";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — TissueQA" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(settingsQuery()),
      context.queryClient.ensureQueryData(currentUserQuery()),
    ]),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: tenant } = useSuspenseQuery(settingsQuery());
  const { data: me } = useSuspenseQuery(currentUserQuery());

  const isAdmin = me.role === "admin";

  return (
    <div
      className="mx-auto space-y-4"
      style={{ padding: "clamp(16px, 3vw, 32px)", maxWidth: "920px" }}
    >
      <div>
        <h1 className="text-lg font-medium tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tenant configuration, eligibility thresholds, and user roles.
        </p>
      </div>

      {!isAdmin && (
        <div className="flex items-start gap-2 rounded-md border border-indeterminate/30 bg-indeterminate-soft/60 px-3 py-2 text-[12px]">
          <Lock className="h-3.5 w-3.5 mt-0.5 text-indeterminate-foreground shrink-0" />
          <div className="text-indeterminate-foreground">
            Read-only — administrator role required to edit settings.
          </div>
        </div>
      )}

      <ProfileCard user={me} />
      <OrganizationCard tenant={tenant} readOnly={!isAdmin} />
      <ThresholdsCard tenant={tenant} readOnly={!isAdmin} />
    </div>
  );
}
