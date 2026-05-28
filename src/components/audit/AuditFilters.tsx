import { Link, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ALL_CATEGORIES, CATEGORY_LABELS } from "@/lib/audit/categories";

const NONE = "__none";
const ALL = "__all";

export interface AuditFiltersState {
  q: string;
  donor: string; // "" = all, "__none" = tenant-level
  actor: string; // "" = all
  group: string; // "" = all, else category key
  from: string; // ISO date or ""
  to: string;
}

export function AuditFilters({
  state,
  donors,
  actors,
  totalShown,
  totalAll,
}: {
  state: AuditFiltersState;
  donors: string[];
  actors: string[];
  totalShown: number;
  totalAll: number;
}) {
  const navigate = useNavigate({ from: "/audit" });

  const update = (partial: Partial<AuditFiltersState>) =>
    navigate({
      search: (prev) => ({ ...prev, ...partial, page: 1 }),
    });

  const hasFilters =
    state.q || state.donor || state.actor || state.group || state.from || state.to;

  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={state.q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Search actor or detail…"
          className="h-8 w-[220px] text-xs"
        />

        <SelectWrap
          value={state.donor || ALL}
          onChange={(v) => update({ donor: v === ALL ? "" : v })}
          width={170}
          label="Donor"
        >
          <SelectItem value={ALL}>All donors</SelectItem>
          <SelectItem value={NONE}>Tenant-level only</SelectItem>
          {donors.map((d) => (
            <SelectItem key={d} value={d} className="font-mono text-xs">
              {d}
            </SelectItem>
          ))}
        </SelectWrap>

        <SelectWrap
          value={state.actor || ALL}
          onChange={(v) => update({ actor: v === ALL ? "" : v })}
          width={180}
          label="Actor"
        >
          <SelectItem value={ALL}>All actors</SelectItem>
          {actors.map((a) => (
            <SelectItem key={a} value={a}>
              {a}
            </SelectItem>
          ))}
        </SelectWrap>

        <SelectWrap
          value={state.group || ALL}
          onChange={(v) => update({ group: v === ALL ? "" : v })}
          width={150}
          label="Action group"
        >
          <SelectItem value={ALL}>All actions</SelectItem>
          {ALL_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectWrap>

        <div className="flex items-center gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            From
          </label>
          <Input
            type="date"
            value={state.from}
            onChange={(e) => update({ from: e.target.value })}
            className="h-8 w-[140px] text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            To
          </label>
          <Input
            type="date"
            value={state.to}
            onChange={(e) => update({ to: e.target.value })}
            className="h-8 w-[140px] text-xs"
          />
        </div>

        {hasFilters && (
          <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
            <Link
              to="/audit"
              search={{ q: "", donor: "", actor: "", group: "", from: "", to: "", page: 1 }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Reset
            </Link>
          </Button>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground">
        Showing <span className="font-mono text-foreground/80">{totalShown}</span> of{" "}
        <span className="font-mono text-foreground/80">{totalAll}</span> entries
      </div>
    </div>
  );
}

function SelectWrap({
  value,
  onChange,
  width,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  width: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs" style={{ width }} aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
