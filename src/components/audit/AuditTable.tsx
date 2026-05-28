import { Link } from "@tanstack/react-router";
import type { AuditEntry } from "@/lib/api/types";
import { ActionBadge } from "@/components/audit/ActionBadge";

export function AuditTable({ rows }: { rows: AuditEntry[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-muted/40 py-16 text-center">
        <h3 className="text-sm font-medium">No matching audit entries</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Adjust the filters above or reset to see the full trail.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-muted/40">
          <tr className="text-left">
            <th className="px-4 py-2.5 font-medium w-[170px]">Timestamp</th>
            <th className="px-4 py-2.5 font-medium w-[160px]">Actor</th>
            <th className="px-4 py-2.5 font-medium w-[210px]">Action</th>
            <th className="px-4 py-2.5 font-medium w-[120px]">Donor</th>
            <th className="px-4 py-2.5 font-medium">Detail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-accent/40 align-top">
              <td className="px-4 py-2 text-[11.5px] font-mono text-muted-foreground" suppressHydrationWarning>
                {formatTs(r.timestamp)}
              </td>
              <td className="px-4 py-2 text-xs">{r.actor}</td>
              <td className="px-4 py-2">
                <ActionBadge action={r.action} />
              </td>
              <td className="px-4 py-2 text-xs">
                {r.donorId ? (
                  <Link
                    to="/donors/$id"
                    params={{ id: r.donorId }}
                    className="font-mono text-primary hover:underline"
                  >
                    {r.donorId}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-2 text-xs text-foreground/85">{r.detail || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTs(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
