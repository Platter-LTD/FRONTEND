"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, Minimize2, RotateCcw } from "lucide-react"
import { DataTable, type ServerPagination } from "@/components/ui/data-table"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ColumnManager } from "@/components/ui/column-manager"
import { TableDownloadModal, type TableDownloadConfig } from "@/components/ui/table-download"
import { TableSettings } from "@/components/ui/table-settings"
import { ToolbarActionButton } from "@/components/ui/toolbar-action-button"
import type { TableColumnPrefs } from "@/hooks/use-table-column-prefs"

/**
 * Config for `DataTable`'s `fullView` prop. Everything is optional — the
 * table's own `columns`/`title` are used when omitted.
 */
export type TableFullViewConfig<TData> = {
  /** Full column set (a superset of the compact table's). Defaults to the table's `columns`. */
  columns?: ColumnDef<TData, unknown>[]
  /** Labels for the "Columns" picker. Defaults to labels derived from the columns. */
  manifest?: { key: string; label: string }[]
  /** Dialog header title. Defaults to the table's own `title`. */
  title?: string
  /** Stable id for persisting column preferences per browser. Omit for session-only prefs. */
  tableId?: string
}

type TableFullViewDialogProps<TData> = {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  manifest: { key: string; label: string }[]
  title?: string
  serverPagination?: ServerPagination
  onRowClick?: (row: TData) => void
  onRefresh?: () => void
  download?: TableDownloadConfig<TData>
  totalRows: number
  isLoading?: boolean
  isRefetching?: boolean
  rowClassName?: (row: TData) => string | undefined
  /** Shared column preferences (order + visibility), owned by the compact table. */
  prefs: TableColumnPrefs
}

/**
 * Maximized view of a table: the same rows as the compact `DataTable`, with a
 * near-full-screen surface, its own toolbar (refresh / download / columns /
 * settings), a frozen first column, and the *same* shared column preferences.
 * No new data is fetched — paging here pages the same underlying query.
 */
export function TableFullViewDialog<TData extends object>({
  open,
  onOpenChange,
  ...rest
}: TableFullViewDialogProps<TData>) {
  // Body rendered unconditionally: Radix mounts DialogContent only while open
  // and runs its own close cleanup (pointer-events, scroll lock).
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FullViewBody {...rest} onClose={() => onOpenChange(false)} />
    </Dialog>
  )
}

function FullViewBody<TData extends object>({
  data,
  columns,
  manifest,
  title,
  serverPagination,
  onRowClick,
  onRefresh,
  download,
  totalRows,
  isLoading,
  isRefetching,
  rowClassName,
  prefs,
  onClose,
}: Omit<TableFullViewDialogProps<TData>, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [downloadOpen, setDownloadOpen] = useState(false)
  // Portal target for popovers — a node inside the dialog so they scroll within its scroll lock.
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null)

  return (
    <DialogContent
      className="flex h-[90vh] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]"
      showCloseButton={false}
    >
      <div
        ref={(el) => setHeaderEl(el)}
        className="flex items-center justify-between gap-3 border-b border-gray-200 px-6 py-4"
      >
        <DialogTitle className="text-lg font-medium text-gray-900">{title ?? "Full view"}</DialogTitle>
        <DialogDescription className="sr-only">
          Expanded, full-screen view of the {title ?? "table"} with all columns.
        </DialogDescription>
        <div className="flex items-center gap-2">
          {onRefresh && <ToolbarActionButton id="refresh" icon={RotateCcw} label="Refresh" onClick={onRefresh} />}
          {download && (
            <ToolbarActionButton id="download" icon={Download} label="Download" onClick={() => setDownloadOpen(true)} />
          )}
          <ColumnManager
            manifest={manifest}
            order={prefs.order}
            hidden={prefs.hidden}
            customized={prefs.customized}
            onReorder={prefs.setOrder}
            onToggle={prefs.toggle}
            onShowAll={prefs.showAll}
            onReset={prefs.reset}
            container={headerEl}
          />
          <TableSettings container={headerEl} />
          <ToolbarActionButton id="expand" icon={Minimize2} label="Collapse" onClick={onClose} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DataTable
          columns={columns}
          data={data}
          showHeader={false}
          serverPagination={serverPagination}
          columnVisibility={prefs.visibility}
          columnOrder={prefs.order}
          pinFirstColumn
          isLoading={isLoading}
          isRefetching={isRefetching}
          onRowClick={onRowClick}
          rowClassName={rowClassName}
          pageSize={25}
          fullView={false}
          bordered={false}
        />
      </div>

      {download != null && (
        <TableDownloadModal open={downloadOpen} onOpenChange={setDownloadOpen} config={download} totalCount={totalRows} />
      )}
    </DialogContent>
  )
}
