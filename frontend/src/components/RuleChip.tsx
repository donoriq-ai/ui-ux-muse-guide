import { cn } from "@/lib/utils";
import type { RuleCitation } from "@/lib/api/types";

export function RuleChip({ rule, className }: { rule: RuleCitation; className?: string }) {
  const all = [
    ...(rule.aatb ?? []).map((s) => ({ kind: "AATB", label: s })),
    ...(rule.cfr ?? []).map((s) => ({ kind: "CFR", label: s })),
  ];
  if (all.length === 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap gap-1.5", className)}>
      {all.map((r) => (
        <span
          key={`${r.kind}-${r.label}`}
          className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary-soft px-2 h-6 font-mono text-[11px] text-primary"
        >
          <span className="text-[9px] font-semibold tracking-wider uppercase text-primary/70">{r.kind}</span>
          <span>{r.label}</span>
        </span>
      ))}
    </span>
  );
}
