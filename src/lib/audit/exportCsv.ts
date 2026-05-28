import type { AuditEntry } from "@/lib/api/types";

function escape(v: string | undefined): string {
  const s = (v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export function buildAuditCsv(rows: AuditEntry[]): string {
  const header = "timestamp,actor,action,donorId,detail";
  const lines = rows.map(
    (r) =>
      `${escape(r.timestamp)},${escape(r.actor)},${escape(r.action)},${escape(r.donorId)},${escape(r.detail)}`,
  );
  return [header, ...lines].join("\n");
}

export function downloadAuditCsv(rows: AuditEntry[]) {
  const csv = buildAuditCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const fname = `tissueqa-audit-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.csv`;
  const a = document.createElement("a");
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
