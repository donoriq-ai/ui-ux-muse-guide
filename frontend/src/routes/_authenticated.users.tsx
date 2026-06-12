import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { currentUserQuery, usersQuery } from "@/lib/api/queries";
import { UsersCard } from "@/components/settings/UsersCard";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — TissueQA" }] }),
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(currentUserQuery());
    if (me.role !== "admin") {
      throw redirect({ to: "/donors" });
    }
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(usersQuery()),
      context.queryClient.ensureQueryData(currentUserQuery()),
    ]),
  component: UsersPage,
});

function UsersPage() {
  const { data: users } = useSuspenseQuery(usersQuery());
  const { data: me } = useSuspenseQuery(currentUserQuery());

  return (
    <div
      className="mx-auto space-y-4"
      style={{ padding: "clamp(16px, 3vw, 32px)", maxWidth: "920px" }}
    >
      <div>
        <h1 className="text-lg font-medium tracking-tight">Users</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage who can access this tenant and who has administrator privileges.
        </p>
      </div>

      <UsersCard users={users} currentUserId={me.id} />
    </div>
  );
}
