import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  readonly key: string;
  readonly header: ReactNode;
  readonly cell: (row: T) => ReactNode;
  /** Hide the column below this breakpoint so narrow screens keep the essentials. */
  readonly hide?: "sm" | "md" | "lg";
  readonly align?: "start" | "end";
  readonly width?: string;
  readonly className?: string;
};

const HIDE = {
  sm: "max-sm:hidden",
  md: "max-md:hidden",
  lg: "max-lg:hidden",
} as const;

const CELL = "border-b border-admin-edge px-3 py-3 align-middle first:pl-4 last:pr-4";

export type DataTableProps<T> = {
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  caption: string;
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
  className?: string;
};

/**
 * The console's one and only table. Products, orders and policies all render
 * through it so header alignment, row rhythm and the empty state never drift
 * between routes.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  skeletonRows = 6,
  empty,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("relative min-w-0 overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-[13px] text-admin-ink">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "h-9 border-b border-admin-edge px-3 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase first:pl-4 last:pr-4",
                  column.align === "end" && "text-right",
                  column.hide && HIDE[column.hide],
                  column.width
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have no identity
                <tr key={`skeleton-${rowIndex}`}>
                  {columns.map((column) => (
                    <td key={column.key} className={cn(CELL, column.hide && HIDE[column.hide])}>
                      <div className="h-3.5 w-full max-w-[120px] animate-pulse rounded-full bg-admin-line" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="transition-colors duration-150 ease-expo hover:bg-admin-rail/70"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        CELL,
                        column.hide && HIDE[column.hide],
                        column.align === "end" && "text-right tabular-nums",
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10">
                {empty ?? <p className="text-center text-[13px] text-muted">Nothing here yet.</p>}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
