import { flexRender, type Table as ReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type Density = "comfortable" | "compact";

const ROW_HEIGHT: Record<Density, number> = {
  comfortable: 44,
  compact: 32,
};

interface DataTableProps<TData> {
  table: ReactTable<TData>;
  density?: Density;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  /** Max height for the virtualized scroll container. */
  maxHeight?: number | string;
  /** Whether the first column should stick on horizontal scroll. */
  stickyFirstColumn?: boolean;
}

export function DataTable<TData>({
  table,
  density = "comfortable",
  onRowClick,
  emptyMessage = "No results.",
  maxHeight = "calc(100vh - 280px)",
  stickyFirstColumn = true,
}: DataTableProps<TData>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const rowHeight = ROW_HEIGHT[density];

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto border border-border bg-surface rounded-md"
      style={{ maxHeight }}
    >
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="sticky top-0 z-20 bg-surface-muted">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header, idx) => {
                const sortable = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const sticky = stickyFirstColumn && idx === 0;
                return (
                  <th
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                      ...(sticky
                        ? { position: "sticky", left: 0, zIndex: 21, background: "var(--surface-muted)" }
                        : {}),
                    }}
                    className={cn(
                      "h-9 px-3 text-left text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground",
                      "border-b border-border",
                      sticky && "border-r border-border",
                    )}
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? (
                          <ChevronUp size={12} />
                        ) : sorted === "desc" ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronsUpDown size={12} className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop }} colSpan={table.getAllLeafColumns().length} />
            </tr>
          )}

          {virtualRows.map((vRow) => {
            const row = rows[vRow.index];
            return (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(
                  "group transition-colors",
                  onRowClick && "cursor-pointer hover:bg-surface-muted/60",
                )}
                style={{ height: rowHeight }}
              >
                {row.getVisibleCells().map((cell, idx) => {
                  const sticky = stickyFirstColumn && idx === 0;
                  return (
                    <td
                      key={cell.id}
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.getSize(),
                        height: rowHeight,
                        ...(sticky
                          ? {
                              position: "sticky",
                              left: 0,
                              zIndex: 1,
                              background: "var(--surface)",
                            }
                          : {}),
                      }}
                      className={cn(
                        "px-3 border-b border-border align-middle",
                        sticky && "border-r border-border group-hover:bg-surface-muted/60",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom }} colSpan={table.getAllLeafColumns().length} />
            </tr>
          )}

          {rows.length === 0 && (
            <tr>
              <td
                colSpan={table.getAllLeafColumns().length}
                className="px-3 py-16 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
