"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Eye, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ACTIONS_COLUMN_ID } from "@/lib/table-column-prefs"
import { useRowDetails } from "@/components/ui/row-details"
import { cn } from "@/lib/utils"

/** Declarative description of a row action, rendered in the kebab menu. */
export type RowAction<T> = {
  label: string
  /** Lucide icon component (rendered at size-4). */
  icon?: React.ComponentType<{ className?: string }>
  /** Return false to hide this action for the given row. */
  show?: (row: T) => boolean
  /** Return true to show the action greyed out for the given row. */
  disabled?: (row: T) => boolean
  /** Red styling for destructive actions. */
  destructive?: boolean
  /** Draw a divider above this action. */
  separatorBefore?: boolean
  onClick: (row: T) => void
}

/** Kebab menu for one row. Renders nothing when no action applies to the row. */
export function RowActionsMenu<T>({ row, actions }: { row: T; actions: RowAction<T>[] }) {
  const openDetails = useRowDetails()
  const shown = actions.filter((a) => !a.show || a.show(row))
  // Every table offers "View details" first — unless the page already has its own "View …" action.
  const visible: RowAction<T>[] =
    openDetails && !shown.some((a) => /^view( details)?$/i.test(a.label.trim()))
      ? [{ label: "View details", icon: Eye, onClick: (r) => openDetails(r) }, ...shown.map((a, i) => (i === 0 ? { ...a, separatorBefore: true } : a))]
      : shown
  if (visible.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-8 text-gray-500" aria-label="More actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visible.map((a, i) => {
          const Icon = a.icon
          return (
            <span key={`${a.label}-${i}`}>
              {a.separatorBefore && i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={a.disabled?.(row)}
                onClick={() => a.onClick(row)}
                className={cn(a.destructive && "text-destructive focus:text-destructive")}
              >
                {Icon && <Icon className={cn("size-4", a.destructive && "text-destructive")} />} {a.label}
              </DropdownMenuItem>
            </span>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The sticky kebab-menu actions column. Must be the last column — `DataTable`
 * pins it to the right edge, never hides it, and keeps it out of the picker.
 */
export function rowActionsColumn<T>(actions: RowAction<T>[] | ((row: T) => RowAction<T>[]) = []): ColumnDef<T, unknown> {
  return {
    id: ACTIONS_COLUMN_ID,
    size: 64,
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <RowActionsMenu row={row.original} actions={typeof actions === "function" ? actions(row.original) : actions} />
    ),
  }
}
