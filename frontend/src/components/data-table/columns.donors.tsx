import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/StatusBadge";
import { TissueTypeBadge } from "@/components/TissueTypeBadge";
import type { Donor } from "@/lib/api/types";

export const donorColumns: ColumnDef<Donor>[] = [
  {
    id: "id",
    accessorKey: "id",
    header: "Donor ID",
    size: 180,
    enableSorting: true,
    cell: ({ row }) => (
      <Link
        to="/donors/$id"
        params={{ id: row.original.id }}
        onClick={(e) => e.stopPropagation()}
        className="font-mono text-[13px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        {row.original.id}
      </Link>
    ),
  },
  {
    id: "tissue",
    accessorKey: "tissueType",
    header: "Tissue",
    size: 130,
    enableSorting: true,
    cell: ({ row }) => <TissueTypeBadge type={row.original.tissueType} />,
  },
  {
    id: "completeness",
    accessorFn: (d) => d.evaluation?.completeness.state ?? "",
    header: "Completeness",
    size: 160,
    enableSorting: true,
    cell: ({ row }) =>
      row.original.evaluation ? (
        <StatusBadge state={row.original.evaluation.completeness.state} size="sm" />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    id: "recommendation",
    accessorFn: (d) => d.evaluation?.recommendation ?? "",
    header: "Recommendation",
    size: 180,
    enableSorting: true,
    cell: ({ row }) =>
      row.original.evaluation ? (
        <StatusBadge state={row.original.evaluation.recommendation} size="sm" />
      ) : (
        <span className="text-xs text-muted-foreground">Not evaluated</span>
      ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    size: 140,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {new Date(row.original.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    ),
  },
  {
    id: "createdBy",
    accessorKey: "createdBy",
    header: "Created by",
    size: 150,
    enableSorting: true,
    cell: ({ row }) => <span className="text-xs">{row.original.createdBy}</span>,
  },
  {
    id: "documents",
    accessorFn: (d) => d.documents.length,
    header: "Docs",
    size: 80,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums">{row.original.documents.length}</span>
    ),
  },
];
