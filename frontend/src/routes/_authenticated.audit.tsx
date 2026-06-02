import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { auditQuery } from "@/lib/api/queries";
import { AuditFilters } from "@/components/audit/AuditFilters";
import { AuditTable } from "@/components/audit/AuditTable";
import { downloadAuditCsv } from "@/lib/audit/exportCsv";
import { categoryOf } from "@/lib/audit/categories";

const PAGE_SIZE = 50;

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  donor: fallback(z.string(), "").default(""),
  actor: fallback(z.string(), "").default(""),
  group: fallback(z.string(), "").default(""),
  from: fallback(z.string(), "").default(""),
  to: fallback(z.string(), "").default(""),
  page: fallback(z.number().int().min(1), 1).default(1),
});

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit — TissueQA" }] }),
  validateSearch: zodValidator(searchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(auditQuery()),
  component: AuditPage,
});

function AuditPage() {
  const search = Route.useSearch();
  const { data: entries } = useSuspenseQuery(auditQuery());

  const donors = useMemo(
    () => Array.from(new Set(entries.map((e) => e.donorId).filter(Boolean) as string[])).sort(),
    [entries],
  );
  const actors = useMemo(
    () => Array.from(new Set(entries.map((e) => e.actor))).sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    const needle = search.q.trim().toLowerCase();
    const fromTs = search.from ? new Date(search.from + "T00:00:00").getTime() : null;
    const toTs = search.to ? new Date(search.to + "T23:59:59.999").getTime() : null;
    return entries.filter((e) => {
      if (search.donor === "__none") {
        if (e.donorId) return false;
      } else if (search.donor) {
        if (e.donorId !== search.donor) return false;
      }
      if (search.actor && e.actor !== search.actor) return false;
      if (search.group && categoryOf(e.action) !== search.group) return false;
      if (fromTs !== null && new Date(e.timestamp).getTime() < fromTs) return false;
      if (toTs !== null && new Date(e.timestamp).getTime() > toTs) return false;
      if (needle) {
        const hay = `${e.actor} ${e.detail} ${e.action}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [entries, search]);

  const totalShown = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalShown / PAGE_SIZE));
  const page = Math.min(search.page, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div
      className="mx-auto space-y-4"
      style={{ padding: "clamp(16px, 3vw, 32px)", maxWidth: "1400px" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Audit trail</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every action across this tenant. Click a donor ID to jump to its workspace.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadAuditCsv(filtered)}
          disabled={filtered.length === 0}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      <AuditFilters
        state={{
          q: search.q,
          donor: search.donor,
          actor: search.actor,
          group: search.group,
          from: search.from,
          to: search.to,
        }}
        donors={donors}
        actors={actors}
        totalShown={totalShown}
        totalAll={entries.length}
      />

      <AuditTable rows={pageRows} />

      {pageCount > 1 && (
        <Pagination page={page} pageCount={pageCount} />
      )}
    </div>
  );
}

function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const navigate = Route.useNavigate();
  const go = (p: number) =>
    navigate({
      search: (prev: z.infer<typeof searchSchema>) => ({
        ...prev,
        page: Math.max(1, Math.min(pageCount, p)),
      }),
    });
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="text-muted-foreground">
        Page <span className="font-mono text-foreground/80">{page}</span> of{" "}
        <span className="font-mono text-foreground/80">{pageCount}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => go(page - 1)} disabled={page === 1}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => go(page + 1)} disabled={page === pageCount}>
          Next
        </Button>
      </div>
    </div>
  );
}
