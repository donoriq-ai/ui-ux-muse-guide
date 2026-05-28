import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

import { donorsPageQuery } from "@/lib/api/queries";
import { Button } from "@/components/ui/button";
import { DataTable, type Density } from "@/components/data-table/DataTable";
import {
  DataTableToolbar,
  ToolbarSelect,
} from "@/components/data-table/DataTableToolbar";
import { donorColumns } from "@/components/data-table/columns.donors";

const PAGE_SIZE = 200;

const sortKey = z.enum([
  "id",
  "tissue",
  "completeness",
  "recommendation",
  "createdAt",
  "createdBy",
  "documents",
]);

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  tissue: fallback(z.enum(["BT", "MS", "all"]), "all").default("all"),
  rec: fallback(z.enum(["ACCEPT", "REJECT", "INDETERMINATE", "none", "all"]), "all").default("all"),
  comp: fallback(z.enum(["COMPLETE", "INCOMPLETE", "all"]), "all").default("all"),
  sort: fallback(sortKey, "createdAt").default("createdAt"),
  dir: fallback(z.enum(["asc", "desc"]), "desc").default("desc"),
  page: fallback(z.number().int().min(1).max(1000), 1).default(1),
  density: fallback(z.enum(["comfortable", "compact"]), "comfortable").default("comfortable"),
});

type SearchValues = z.infer<typeof searchSchema>;

function buildQuery(s: SearchValues) {
  return {
    q: s.q || undefined,
    tissue: s.tissue === "all" ? undefined : s.tissue,
    rec: s.rec === "all" ? undefined : s.rec,
    comp: s.comp === "all" ? undefined : s.comp,
    sort: s.sort,
    dir: s.dir,
    page: s.page,
    pageSize: PAGE_SIZE,
  };
}

export const Route = createFileRoute("/donors/")({
  head: () => ({ meta: [{ title: "Donors — TissueQA" }] }),
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({
    q: search.q,
    tissue: search.tissue,
    rec: search.rec,
    comp: search.comp,
    sort: search.sort,
    dir: search.dir,
    page: search.page,
  }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      donorsPageQuery(
        buildQuery({ ...deps, density: "comfortable" } as SearchValues),
      ),
    ),
  component: DonorsPage,
});

function DonorsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/donors" });

  const query = useMemo(() => buildQuery(search), [search]);
  const { data } = useSuspenseQuery(donorsPageQuery(query));

  const [sorting, setSorting] = useState<SortingState>([
    { id: search.sort, desc: search.dir === "desc" },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data: data.rows,
    columns: donorColumns,
    state: { sorting, columnVisibility },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      const first = next[0];
      if (first) {
        navigate({
          search: (prev) => ({
            ...prev,
            sort: first.id as SearchValues["sort"],
            dir: first.desc ? "desc" : "asc",
            page: 1,
          }),
        });
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
  });

  const setSearch = (patch: Partial<SearchValues>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) });

  const setDensity = (d: Density) =>
    navigate({ search: (prev) => ({ ...prev, density: d }) });

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const startIdx = data.total === 0 ? 0 : (search.page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(data.total, search.page * PAGE_SIZE);

  const activeFilters = [
    search.q && {
      label: "Search",
      value: search.q,
      onClear: () => setSearch({ q: "" }),
    },
    search.tissue !== "all" && {
      label: "Tissue",
      value: search.tissue,
      onClear: () => setSearch({ tissue: "all" }),
    },
    search.rec !== "all" && {
      label: "Recommendation",
      value: search.rec,
      onClear: () => setSearch({ rec: "all" }),
    },
    search.comp !== "all" && {
      label: "Completeness",
      value: search.comp,
      onClear: () => setSearch({ comp: "all" }),
    },
  ].filter(Boolean) as { label: string; value: string; onClear: () => void }[];

  return (
    <div className="page-pad max-w-none">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-foreground">Donors</h1>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            {data.totalUnfiltered.toLocaleString()} donor records in this tenant
            {data.total !== data.totalUnfiltered &&
              ` · ${data.total.toLocaleString()} match filters`}
          </p>
        </div>
        <Button asChild size="sm" className="h-9">
          <Link to="/donors/new">
            <Plus className="mr-1.5 h-4 w-4" /> Create donor
          </Link>
        </Button>
      </div>

      <DataTableToolbar
        table={table}
        search={search.q}
        onSearchChange={(v) => setSearch({ q: v })}
        searchPlaceholder="Search Donor ID or creator…"
        density={search.density}
        onDensityChange={setDensity}
        totalLabel={
          data.total > 0
            ? `${startIdx.toLocaleString()}–${endIdx.toLocaleString()} of ${data.total.toLocaleString()}`
            : "0 results"
        }
        activeFilters={activeFilters}
        onClearAll={() =>
          navigate({
            search: (prev) => ({
              ...prev,
              q: "",
              tissue: "all",
              rec: "all",
              comp: "all",
              page: 1,
            }),
          })
        }
        filters={
          <>
            <ToolbarSelect
              value={search.tissue}
              onChange={(v) => setSearch({ tissue: v as SearchValues["tissue"] })}
              placeholder="Tissue"
              width={140}
              options={[
                { value: "all", label: "All tissue" },
                { value: "BT", label: "Birth tissue" },
                { value: "MS", label: "Musculoskeletal" },
              ]}
            />
            <ToolbarSelect
              value={search.rec}
              onChange={(v) => setSearch({ rec: v as SearchValues["rec"] })}
              placeholder="Recommendation"
              width={190}
              options={[
                { value: "all", label: "All recommendations" },
                { value: "ACCEPT", label: "ACCEPT" },
                { value: "REJECT", label: "REJECT" },
                { value: "INDETERMINATE", label: "INDETERMINATE" },
                { value: "none", label: "Not evaluated" },
              ]}
            />
            <ToolbarSelect
              value={search.comp}
              onChange={(v) => setSearch({ comp: v as SearchValues["comp"] })}
              placeholder="Completeness"
              width={170}
              options={[
                { value: "all", label: "All completeness" },
                { value: "COMPLETE", label: "COMPLETE" },
                { value: "INCOMPLETE", label: "INCOMPLETE" },
              ]}
            />
          </>
        }
      />

      <div className="mt-3">
        <DataTable
          table={table}
          density={search.density}
          onRowClick={(donor) =>
            navigate({ to: "/donors/$id", params: { id: donor.id } })
          }
          emptyMessage="No donors match these filters."
        />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-xs text-muted-foreground tabular-nums">
            Page {search.page} of {totalPages}
          </p>
          <div className="inline-flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={search.page <= 1}
              onClick={() =>
                navigate({ search: (prev) => ({ ...prev, page: prev.page - 1 }) })
              }
            >
              <ChevronLeft className="size-3.5" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={search.page >= totalPages}
              onClick={() =>
                navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })
              }
            >
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
