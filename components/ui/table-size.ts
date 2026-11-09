"use client"

import { tableSizePref, usePreference, type TableSizeValue } from "@/lib/table-preferences"

export type TableSize = TableSizeValue
export type TableDensity = "comfortable" | "compact"

/**
 * Class sets for each `table.size`. "large" is the roomy look (24px cell
 * padding, 14px text); medium tightens padding and rows at the same text size;
 * small steps text down to 12px (with a scoped rule in globals.css for
 * renderers that hardcode `text-sm`).
 */
export const TABLE_SIZES: Record<
  TableSize,
  {
    table: string
    head: string
    /** Offset of the refetch progress bar (sits on the header's bottom edge). */
    refetchTop: string
    cellX: string
    row: Record<TableDensity, string>
    cellY: Record<TableDensity, string>
  }
> = {
  large: {
    table: "text-sm",
    head: "h-11 px-6 py-3",
    refetchTop: "top-11",
    cellX: "px-6",
    row: { comfortable: "h-14", compact: "h-10" },
    cellY: { comfortable: "py-4", compact: "py-2.5" },
  },
  medium: {
    table: "text-sm",
    head: "h-10 px-4 py-2.5",
    refetchTop: "top-10",
    cellX: "px-4",
    row: { comfortable: "h-12", compact: "h-9" },
    cellY: { comfortable: "py-3", compact: "py-2" },
  },
  small: {
    table: "text-xs",
    head: "h-9 px-3 py-2",
    refetchTop: "top-9",
    cellX: "px-3",
    row: { comfortable: "h-10", compact: "h-8" },
    cellY: { comfortable: "py-2", compact: "py-1.5" },
  },
}

/** The user's table size and its class set. Pass `data-table-size` to `<Table>`. */
export function useTableSize() {
  const [size] = usePreference(tableSizePref)
  return { size, classes: TABLE_SIZES[size] ?? TABLE_SIZES.small }
}
