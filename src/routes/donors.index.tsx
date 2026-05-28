import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { donorsQuery } from "@/lib/api/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { TissueTypeBadge } from "@/components/TissueTypeBadge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import type { Donor, EvalState, TissueType, CompletenessState } from "@/lib/api/types";

export const Route = createFileRoute("/donors/")({
  head: () => ({ meta: [{ title: "Donors — TissueQA" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(donorsQuery()),
  component: DonorsPage,
});

function DonorsPage() {
  const { data: donors } = useSuspenseQuery(donorsQuery());
  const [q, setQ] = useState("");
  const [tissue, setTissue] = useState<TissueType | "all">("all");
  const [rec, setRec] = useState<EvalState | "all" | "none">("all");
  const [comp, setComp] = useState<CompletenessState | "all">("all");

  const filtered = useMemo(() => {
    return donors.filter((d) => {
      if (q && !d.id.toLowerCase().includes(q.toLowerCase())) return false;
      if (tissue !== "all" && d.tissueType !== tissue) return false;
      if (rec !== "all") {
        if (rec === "none" && d.evaluation !== null) return false;
        if (rec !== "none" && d.evaluation?.recommendation !== rec) return false;
      }
      if (comp !== "all" && d.evaluation?.completeness.state !== comp) return false;
      return true;
    });
  }, [donors, q, tissue, rec, comp]);

  return (
    <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Donors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {donors.length} donor{donors.length === 1 ? "" : "s"} in this tenant. Click any row to open the workspace.
          </p>
        </div>
        <Button asChild>
          <Link to="/donors/new">
            <Plus className="mr-1.5 h-4 w-4" /> Create donor
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border bg-surface">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Donor ID…"
              className="pl-8 h-9"
            />
          </div>
          <Select value={tissue} onValueChange={(v) => setTissue(v as TissueType | "all")}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Tissue type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tissue types</SelectItem>
              <SelectItem value="BT">Birth Tissue (BT)</SelectItem>
              <SelectItem value="MS">Musculoskeletal (MS)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rec} onValueChange={(v) => setRec(v as EvalState | "all" | "none")}>
            <SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="Recommendation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All recommendations</SelectItem>
              <SelectItem value="ACCEPT">ACCEPT</SelectItem>
              <SelectItem value="REJECT">REJECT</SelectItem>
              <SelectItem value="INDETERMINATE">INDETERMINATE</SelectItem>
              <SelectItem value="none">Not yet evaluated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={comp} onValueChange={(v) => setComp(v as CompletenessState | "all")}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Completeness" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All completeness</SelectItem>
              <SelectItem value="COMPLETE">COMPLETE</SelectItem>
              <SelectItem value="INCOMPLETE">INCOMPLETE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium">Donor ID</th>
                <th className="px-4 py-2.5 font-medium">Tissue</th>
                <th className="px-4 py-2.5 font-medium">Completeness</th>
                <th className="px-4 py-2.5 font-medium">Recommendation</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
                <th className="px-4 py-2.5 font-medium text-right">Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => (
                <DonorRow key={d.id} donor={d} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No donors match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DonorRow({ donor }: { donor: Donor }) {
  return (
    <tr className="hover:bg-accent/40 transition-colors group">
      <td className="px-4 py-3">
        <Link
          to="/donors/$id"
          params={{ id: donor.id }}
          className="font-mono text-[13px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {donor.id}
        </Link>
      </td>
      <td className="px-4 py-3"><TissueTypeBadge type={donor.tissueType} /></td>
      <td className="px-4 py-3">
        {donor.evaluation ? <StatusBadge state={donor.evaluation.completeness.state} size="sm" /> : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3">
        {donor.evaluation ? <StatusBadge state={donor.evaluation.recommendation} size="sm" /> : <span className="text-xs text-muted-foreground">Not evaluated</span>}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(donor.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
      </td>
      <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">{donor.documents.length}</td>
    </tr>
  );
}
