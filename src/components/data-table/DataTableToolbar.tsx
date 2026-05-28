import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, SlidersHorizontal, Rows3, Rows2 } from "lucide-react";
import type { Table as ReactTable } from "@tanstack/react-table";
import { FilterChip } from "@/components/FilterChip";
import { cn } from "@/lib/utils";
import type { Density } from "./DataTable";

interface FilterValue {
  label: string;
  value: string;
  onClear: () => void;
}

interface DataTableToolbarProps<TData> {
  table: ReactTable<TData>;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  activeFilters?: FilterValue[];
  onClearAll?: () => void;
  density: Density;
  onDensityChange: (d: Density) => void;
  totalLabel?: string;
}

export function DataTableToolbar<TData>({
  table,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  activeFilters = [],
  onClearAll,
  density,
  onDensityChange,
  totalLabel,
}: DataTableToolbarProps<TData>) {
  const cols = table.getAllLeafColumns().filter((c) => c.getCanHide());
  const hasActive = activeFilters.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-9 bg-surface"
          />
        </div>

        {filters}

        <div className="ml-auto flex items-center gap-1.5">
          {totalLabel && (
            <span className="text-xs text-muted-foreground tabular-nums px-2 hidden sm:inline">
              {totalLabel}
            </span>
          )}

          <div className="inline-flex rounded border border-border bg-surface">
            <button
              type="button"
              onClick={() => onDensityChange("comfortable")}
              aria-label="Comfortable density"
              className={cn(
                "h-9 px-2.5 grid place-items-center text-muted-foreground hover:text-foreground transition-colors",
                density === "comfortable" && "bg-surface-muted text-foreground",
              )}
            >
              <Rows3 size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDensityChange("compact")}
              aria-label="Compact density"
              className={cn(
                "h-9 px-2.5 grid place-items-center text-muted-foreground hover:text-foreground transition-colors border-l border-border",
                density === "compact" && "bg-surface-muted text-foreground",
              )}
            >
              <Rows2 size={14} />
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border bg-surface text-xs hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Column visibility"
            >
              <SlidersHorizontal size={13} />
              Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">
                Toggle columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {cols.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={c.getIsVisible()}
                  onCheckedChange={(v) => c.toggleVisibility(Boolean(v))}
                  className="text-xs capitalize"
                >
                  {c.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {hasActive && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <FilterChip key={f.label} label={f.label} value={f.value} onClear={f.onClear} />
          ))}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Pre-built select-based filter that matches toolbar styling. */
export function ToolbarSelect({
  value,
  onChange,
  placeholder,
  options,
  width = 170,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  width?: number;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 bg-surface" style={{ width }}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
