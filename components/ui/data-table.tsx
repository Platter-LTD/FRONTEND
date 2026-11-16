"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type VisibilityState,
} from "@tanstack/react-table"
import { Info } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TableCardHeader } from "@/components/ui/table-card-header"
import type { TableDownloadConfig, TableDownloadOptions } from "@/components/ui/table-download"
import { TableFullViewDialog, type TableFullViewConfig } from "@/components/ui/table-full-view-dialog"
import { ColumnManager } from "@/components/ui/column-manager"
import { rowActionsColumn } from "@/components/ui/row-actions"
import { RowDetailsContext, RowDetailsDrawer } from "@/components/ui/row-details"
import { TableTopScrollbar } from "@/components/ui/table-top-scrollbar"
import { TableEmptyState, TableErrorState, errorMessageOf } from "@/components/ui/table-states"
import { useTableSize } from "@/components/ui/table-size"
import { FilterTriggerButton, TableFilters, type TableFiltersConfig } from "@/components/ui/table-filters"
import { useTableColumnPrefs } from "@/hooks/use-table-column-prefs"
import {
  tableDensityPref,
  tableFilterModePref,
  tableFiltersExpandedPref,
  usePreference,
} from "@/lib/table-preferences"
import {
  ACTIONS_COLUMN_ID,
  applyColumnOrder,
  columnIdOf,
  columnManifestOf,
  computeAutoFitVisibility,
  dataColumnIdsOf,
  visibilityFromHidden,
} from "@/lib/table-column-prefs"
import { cn } from "@/lib/utils"

export type { ColumnDef } from "@tanstack/react-table"
export type { TableFiltersConfig } from "@/components/ui/table-filters"

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// Stable empty visibility map for the measure pass.
const EMPTY_VISIBILITY: VisibilityState = {}

// Auto-fit must measure and trim before paint; useLayoutEffect warns during
// SSR, so degrade to useEffect on the server.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

function visibilityEqual(a: VisibilityState, b: VisibilityState): boolean {
  const aHidden = Object.keys(a).filter((k) => a[k] === false)
  const bHidden = Object.keys(b).filter((k) => b[k] === false)
  if (aHidden.length !== bHidden.length) return false
  const bSet = new Set(bHidden)
  return aHidden.every((k) => bSet.has(k))
}

/** Deterministic placeholder bar width (45–95%) so skeleton rows don't flicker. */
function skeletonBarWidth(row: number, col: number): string {
  const hash = (row * 31 + col * 17) % 11
  return `${45 + hash * 5}%`
}

/** Inline width style from `size`/`minSize`/`maxSize` — only when `size` is set. */
function columnWidthStyle(columnDef: { size?: number; minSize?: number; maxSize?: number }): React.CSSProperties | undefined {
  if (columnDef.size == null) return undefined
  return {
    width: columnDef.size,
    minWidth: columnDef.minSize ?? columnDef.size,
    maxWidth: columnDef.maxSize ?? columnDef.size,
  }
}

/** Loading rows shaped from the live column model so nothing reflows when data lands. */
function TableSkeletonRows({
  columns,
  rowCount,
  rowHeightClass,
  cellPaddingClass,
}: {
  columns: { id: string; columnDef: { size?: number; minSize?: number; maxSize?: number } }[]
  rowCount: number
  rowHeightClass: string
  cellPaddingClass: string
}) {
  return Array.from({ length: rowCount }, (_, rowIndex) => (
    <TableRow key={rowIndex} className={cn("border-b border-gray-200 hover:bg-transparent", rowHeightClass)}>
      {columns.map((column, colIndex) => (
        <TableCell
          key={column.id}
          style={columnWidthStyle(column.columnDef)}
          className={cn(cellPaddingClass, column.id === ACTIONS_COLUMN_ID && "px-2 text-center")}
        >
          <Skeleton
            aria-hidden
            className={cn("h-4 bg-gray-200", column.id === ACTIONS_COLUMN_ID && "mx-auto w-4")}
            style={column.id === ACTIONS_COLUMN_ID ? undefined : { width: skeletonBarWidth(rowIndex, colIndex) }}
          />
        </TableCell>
      ))}
    </TableRow>
  ))
}

/** Read a (possibly dotted) key off a row. */
function readPath(row: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>(
    (cur, k) => (cur != null && typeof cur === "object" ? (cur as Record<string, unknown>)[k] : undefined),
    row
  )
}

/** The raw value a column reads from a row (accessorFn, else accessorKey). */
function columnValue<TData>(column: ColumnDef<TData, unknown>, row: TData, index: number): unknown {
  const fn = (column as { accessorFn?: (row: TData, index: number) => unknown }).accessorFn
  if (fn) return fn(row, index)
  const key = (column as { accessorKey?: string }).accessorKey
  return key ? readPath(row, key) : undefined
}

function toSearchText(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return ""
    }
  }
  return String(value)
}

export type ServerPagination = {
  totalCount: number
  /** 0-based. */
  pageIndex: number
  pageSize: number
  onPageChange: (pageIndex: number) => void
  /** When provided, the page-size selector is rendered for server-paginated tables. */
  onPageSizeChange?: (pageSize: number) => void
}

export type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  title?: React.ReactNode
  /** Optional subtitle under the title. */
  description?: React.ReactNode
  /** Toolbar content to the left of the built-in actions (e.g. a "New" button). */
  action?: React.ReactNode
  pageSize?: number
  /** Options for the page-size selector. Pass `false` to hide. */
  pageSizeOptions?: number[] | false
  /** Empty-state content. A string becomes the illustrated empty state's headline. */
  empty?: React.ReactNode
  onRefresh?: () => void
  /** Server/page-driven search. For in-memory search use `clientSearch`. */
  onSearch?: (term: string) => void
  /**
   * Search the loaded rows in the browser. `true` matches the term against
   * every column's value; pass a predicate for custom matching.
   */
  clientSearch?: boolean | ((row: TData, term: string) => boolean)
  /** Explicitly show/hide the entire header. Auto-derived when omitted. */
  showHeader?: boolean
  /** Defaults to `!!onRefresh`. */
  showRefresh?: boolean
  /** Defaults to `!!onSearch || !!clientSearch`. */
  showSearch?: boolean
  searchPlaceholder?: string
  /** Seed for the search box (e.g. a term the page already holds). */
  initialSearch?: string
  /**
   * Export to Excel / CSV / PDF. `true` exports the table's columns and rows;
   * pass options to set the filename, columns, or a `fetchPage` for
   * server-paginated tables (so "All pages" can fetch beyond the loaded page).
   */
  download?: boolean | TableDownloadOptions<TData>
  serverPagination?: ServerPagination
  /** Bump to send a client-paginated table back to page 1 (e.g. the filter signature). */
  resetPageSignal?: string | number
  isLoading?: boolean
  isRefetching?: boolean
  /** The list query failed — renders the error state instead of "No records". */
  isError?: boolean
  error?: unknown
  /** Hide the pagination footer when every row fits on one page. */
  hidePaginationWhenSinglePage?: boolean
  /** `false` shows every row on one page with no pagination footer. */
  paginate?: boolean
  /** Extra classes for a body row. */
  rowClassName?: (row: TData) => string | undefined
  /** Clicking (or Enter on) a row. Clicks inside the actions column never reach this. */
  onRowClick?: (row: TData) => void
  /**
   * Row details. On by default: every row's "⋯" menu offers "View details",
   * which calls `onRowClick` when the page has one (its own details view) and
   * otherwise opens a drawer listing every field of the row's backend record.
   * Pass `record` / `load` to show (or fetch) the full record, a `title` to
   * name the drawer, or `false` to turn it off.
   */
  rowDetails?:
    | boolean
    | {
        title?: (row: TData) => React.ReactNode
        /** Always open the details drawer, even when `onRowClick` does something else (e.g. navigates). */
        drawer?: boolean
        /** The full backend object to show for a row (defaults to the row itself). */
        record?: (row: TData) => unknown
        /** Fetch the complete record from the backend when the drawer opens. */
        load?: (row: TData) => Promise<unknown>
      }
  getRowId?: (row: TData, index: number) => string
  /** Controlled column visibility (opts out of column management). */
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>
  /** Controlled column order (data-column ids). Used by the full view. */
  columnOrder?: string[]
  /** Freeze the first visible data column to the left edge. */
  pinFirstColumn?: boolean
  /** Row density. Defaults to the user's preference. */
  density?: "comfortable" | "compact"
  /** The page's filter bar — shown inline, collapsible, or in a dialog per user preference. */
  filters?: TableFiltersConfig
  /**
   * Column management + full view. On by default: a "Columns" control
   * (show/hide + drag to reorder), auto-fit (columns that don't fit are hidden
   * rather than scrolling, still reachable in full view), and an "Expand" icon
   * that opens the full-screen view. Pass `false` to turn it all off, or a
   * config to set the dialog title / extra columns.
   */
  fullView?: boolean | TableFullViewConfig<TData>
  /** Stable id for remembering this table's column layout. Shorthand for `fullView.tableId`. */
  tableId?: string
  fullViewOpen?: boolean
  onFullViewOpenChange?: (open: boolean) => void
  /** Draw the card border/background. Defaults to true. */
  bordered?: boolean
  className?: string
}

export function DataTable<TData extends object>({
  columns,
  data,
  title,
  description,
  action,
  pageSize = 10,
  pageSizeOptions,
  empty,
  onRefresh,
  onSearch,
  clientSearch,
  showHeader,
  showRefresh,
  showSearch,
  searchPlaceholder,
  initialSearch,
  download,
  serverPagination,
  resetPageSignal,
  isLoading = false,
  isRefetching = false,
  isError = false,
  error,
  hidePaginationWhenSinglePage = false,
  paginate = true,
  rowClassName,
  onRowClick,
  getRowId,
  rowDetails = true,
  columnVisibility,
  onColumnVisibilityChange,
  columnOrder,
  pinFirstColumn = false,
  density,
  filters,
  fullView = true,
  tableId,
  fullViewOpen,
  onFullViewOpenChange,
  bordered = true,
  className,
}: DataTableProps<TData>) {
  const [pageIndex, setPageIndex] = useState(0)
  const [clientPageSize, setClientPageSize] = useState(pageSize)
  const [searchTerm, setSearchTerm] = useState(initialSearch ?? "")

  // Return a client-paginated table to page 1 when `resetPageSignal` changes.
  const [prevResetPageSignal, setPrevResetPageSignal] = useState(resetPageSignal)
  if (resetPageSignal !== prevResetPageSignal) {
    setPrevResetPageSignal(resetPageSignal)
    if (!serverPagination && pageIndex !== 0) setPageIndex(0)
  }
  const [hasRightOverflow, setHasRightOverflow] = useState(false)
  const [hasLeftShadow, setHasLeftShadow] = useState(false)
  const [fullViewOpenInternal, setFullViewOpenInternal] = useState(false)
  const tableWrapperRef = useRef<HTMLDivElement>(null)

  const isFullViewOpen = fullViewOpen ?? fullViewOpenInternal
  const changeFullViewOpen = (open: boolean) => {
    if (fullViewOpen === undefined) setFullViewOpenInternal(open)
    onFullViewOpenChange?.(open)
  }

  const fullViewConfig: TableFullViewConfig<TData> | null =
    fullView === false ? null : fullView === true ? {} : fullView
  const fullViewColumns = fullViewConfig?.columns ?? columns

  // ─── Client search ──────────────────────────────────────────────────────────
  const searchedData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!clientSearch || !term) return data
    if (typeof clientSearch === "function") return data.filter((row) => clientSearch(row, term))
    // Matches what the columns show, plus every plain field on the row itself —
    // so an id, phone or reference that isn't a visible column is still findable.
    return data.filter(
      (row, i) =>
        columns.some((c) => {
          if (columnIdOf(c) === ACTIONS_COLUMN_ID) return false
          return toSearchText(columnValue(c, row, i)).toLowerCase().includes(term)
        }) ||
        Object.values(row as Record<string, unknown>).some(
          (v) => (typeof v === "string" || typeof v === "number") && String(v).toLowerCase().includes(term)
        )
    )
  }, [data, searchTerm, clientSearch, columns])

  const handleSearch = (term: string) => {
    if (clientSearch) {
      setSearchTerm(term)
      setPageIndex(0)
    }
    onSearch?.(term)
  }

  // ─── Column management (order + visibility) ─────────────────────────────────
  const managesColumns = !!fullViewConfig && columnVisibility == null
  const allDataIds = useMemo(() => dataColumnIdsOf(columns), [columns])
  const defaultHiddenIds = useMemo(
    () => dataColumnIdsOf(columns.filter((c) => c.meta?.defaultHidden)),
    [columns]
  )
  const prefs = useTableColumnPrefs({
    storageKey: fullViewConfig?.tableId ?? tableId,
    allIds: allDataIds,
    defaultHidden: defaultHiddenIds,
  })
  const manifest = useMemo(
    () => fullViewConfig?.manifest ?? columnManifestOf(fullViewColumns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fullViewConfig?.manifest, fullViewColumns]
  )

  // Every table gets the sticky "⋯" actions column so "View details" is always reachable.
  const detailsEnabled = rowDetails !== false
  const columnsWithActions = useMemo(
    () =>
      detailsEnabled && !columns.some((c) => columnIdOf(c) === ACTIONS_COLUMN_ID)
        ? [...columns, rowActionsColumn<TData>()]
        : columns,
    [columns, detailsEnabled]
  )

  const effectiveOrder = columnOrder ?? (managesColumns ? prefs.order : undefined)
  const orderedColumns = useMemo(
    () => (effectiveOrder ? applyColumnOrder(columnsWithActions, effectiveOrder) : columnsWithActions),
    [columnsWithActions, effectiveOrder]
  )

  // ─── Auto-fit ───────────────────────────────────────────────────────────────
  // Show only as many of the chosen, ordered columns as fit; the rest are
  // hidden (still reachable in full view). Order is priority.
  const autoFit = managesColumns
  const [autoVisibility, setAutoVisibility] = useState<VisibilityState>({})
  const colWidthsRef = useRef<Map<string, number>>(new Map())
  const measuredKeyRef = useRef<string | null>(null)

  const autoFitIds = useMemo(
    () => (managesColumns ? prefs.order.filter((id) => !prefs.hidden.includes(id)) : []),
    [managesColumns, prefs.order, prefs.hidden]
  )
  const hiddenVisibility = useMemo(
    () => (managesColumns ? visibilityFromHidden(prefs.hidden) : undefined),
    [managesColumns, prefs.hidden]
  )

  const [contentVersion, setContentVersion] = useState(0)
  const { size: tableSize, classes: sizeClasses } = useTableSize()
  const measureKey = autoFit ? `${autoFitIds.join("|")}#${searchedData.length}#${contentVersion}#${tableSize}` : ""
  const needsMeasure = autoFit && measuredKeyRef.current !== measureKey

  // While a measurement is pending, render every chosen column so each <th>
  // can be measured; the layout effect trims before paint.
  const managedVisibility =
    !autoFit || needsMeasure ? (hiddenVisibility ?? EMPTY_VISIBILITY) : { ...(hiddenVisibility ?? {}), ...autoVisibility }
  const effectiveVisibility = columnVisibility ?? (managesColumns ? managedVisibility : undefined)

  // Overflow shadows for the sticky actions column and the pinned first column.
  useEffect(() => {
    const scrollEl = tableWrapperRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
    if (!scrollEl) return
    const update = () => {
      const max = scrollEl.scrollWidth - scrollEl.clientWidth
      setHasRightOverflow(max > 1 && scrollEl.scrollLeft < max - 1)
      setHasLeftShadow(scrollEl.scrollLeft > 1)
    }
    update()
    scrollEl.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(scrollEl)
    if (scrollEl.firstElementChild) ro.observe(scrollEl.firstElementChild)
    return () => {
      scrollEl.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [searchedData.length])

  useIsomorphicLayoutEffect(() => {
    if (!autoFit) return
    const scrollEl = tableWrapperRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
    if (!scrollEl) return

    // Read every header's intrinsic width. If the set currently fits, drop the
    // `min-w-full` stretch briefly so the readings stay intrinsic.
    const measure = () => {
      const tableEl = scrollEl.querySelector<HTMLElement>('[data-slot="table"]')
      if (!tableEl) return
      const read = () =>
        scrollEl.querySelectorAll<HTMLElement>("th[data-col-id]").forEach((th) => {
          const id = th.getAttribute("data-col-id")
          if (id) colWidthsRef.current.set(id, th.getBoundingClientRect().width)
        })
      if (tableEl.scrollWidth > scrollEl.clientWidth + 1) {
        read()
      } else {
        const prevMinWidth = tableEl.style.minWidth
        tableEl.style.minWidth = "0px"
        read()
        tableEl.style.minWidth = prevMinWidth
      }
    }

    const recompute = () => {
      const widths = colWidthsRef.current
      if (widths.size === 0) return
      const available = scrollEl.clientWidth
      if (available === 0) return
      const next = computeAutoFitVisibility(autoFitIds, widths, available, widths.get(ACTIONS_COLUMN_ID) ?? 0)
      setAutoVisibility((prev) => (visibilityEqual(prev, next) ? prev : next))
    }

    const remeasure = () => {
      measure()
      recompute()
    }

    if (measuredKeyRef.current !== measureKey) {
      measure()
      measuredKeyRef.current = measureKey
    }
    recompute()

    // Re-check once layout has settled and web fonts have swapped in.
    const raf = requestAnimationFrame(remeasure)
    let cancelled = false
    const fonts = typeof document !== "undefined" ? document.fonts : undefined
    if (fonts && fonts.status !== "loaded") {
      fonts.ready.then(() => {
        if (!cancelled) remeasure()
      })
    }

    const ro = new ResizeObserver(recompute)
    ro.observe(scrollEl)

    // Cells can widen after measurement with the row count unchanged (a lookup
    // resolving, paging). When the table overflows and a visible column is
    // wider than cached, force a full remeasure.
    const tableEl = scrollEl.querySelector<HTMLElement>('[data-slot="table"]')
    const contentRo = new ResizeObserver(() => {
      if (!tableEl || tableEl.scrollWidth <= scrollEl.clientWidth + 1) return
      const grew = [...scrollEl.querySelectorAll<HTMLElement>("th[data-col-id]")].some((th) => {
        const id = th.getAttribute("data-col-id")
        const cached = id ? colWidthsRef.current.get(id) : undefined
        return cached != null && th.getBoundingClientRect().width > cached + 1
      })
      if (grew) setContentVersion((v) => v + 1)
    })
    if (tableEl) contentRo.observe(tableEl)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      contentRo.disconnect()
    }
  }, [measureKey, autoFit])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: searchedData,
    columns: orderedColumns,
    getCoreRowModel: getCoreRowModel(),
    ...(getRowId ? { getRowId } : {}),
    ...(effectiveVisibility ? { state: { columnVisibility: effectiveVisibility } } : {}),
    ...(onColumnVisibilityChange ? { onColumnVisibilityChange } : {}),
  })

  // ─── Row details ────────────────────────────────────────────────────────────
  const [detailsRowId, setDetailsRowId] = useState<string | null>(null)
  const detailsRow = detailsRowId != null ? (table.getCoreRowModel().rowsById[detailsRowId] ?? null) : null
  const forceDetailsDrawer = typeof rowDetails === "object" && rowDetails.drawer === true
  const openDetails = (original: unknown) => {
    if (onRowClick && !forceDetailsDrawer) {
      onRowClick(original as TData)
      return
    }
    const match = table.getCoreRowModel().rows.find((r) => r.original === original)
    if (match) setDetailsRowId(match.id)
  }
  const detailsTitle = (() => {
    if (!detailsRow) return "Details"
    if (typeof rowDetails === "object" && rowDetails.title) return rowDetails.title(detailsRow.original)
    const first = detailsRow.getAllCells().find((c) => c.column.id !== ACTIONS_COLUMN_ID)
    const value = first ? first.getValue() : undefined
    return value != null && typeof value !== "object" && String(value).trim() ? String(value) : "Details"
  })()

  const pinnedColumnId = pinFirstColumn
    ? table.getVisibleLeafColumns().find((c) => c.id !== ACTIONS_COLUMN_ID)?.id
    : undefined

  const autoHiddenIds = useMemo(
    () => Object.keys(autoVisibility).filter((id) => autoVisibility[id] === false),
    [autoVisibility]
  )

  // ─── Filter presentation ────────────────────────────────────────────────────
  const [filterMode] = usePreference(tableFilterModePref)
  const [filtersExpanded, setFiltersExpanded] = usePreference(tableFiltersExpandedPref)
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false)
  const filtersOpen = filterMode === "collapsible" ? filtersExpanded : filtersDialogOpen
  const setFiltersOpen = (open: boolean) =>
    filterMode === "collapsible" ? setFiltersExpanded(open) : setFiltersDialogOpen(open)
  const filterControl =
    filters && filterMode !== "inline" ? (
      <FilterTriggerButton
        activeCount={filters.activeCount ?? 0}
        open={filtersOpen}
        mode={filterMode}
        onClick={() => setFiltersOpen(!filtersOpen)}
        labelled={false}
      />
    ) : undefined

  const [globalDensity] = usePreference(tableDensityPref)
  const effectiveDensity = density ?? globalDensity
  const rowHeightClass = sizeClasses.row[effectiveDensity]
  const cellPaddingClass = cn(sizeClasses.cellX, sizeClasses.cellY[effectiveDensity])

  const shownDataColumns = table.getVisibleLeafColumns().filter((c) => c.id !== ACTIONS_COLUMN_ID).length
  const chosenDataColumns = autoFitIds.length
  const columnsHint =
    managesColumns && chosenDataColumns > 0 && shownDataColumns < chosenDataColumns
      ? `Showing ${shownDataColumns} of ${chosenDataColumns} columns`
      : undefined

  // ─── Pagination ─────────────────────────────────────────────────────────────
  const allRows = table.getCoreRowModel().rows
  const activePageIndex = serverPagination ? serverPagination.pageIndex : pageIndex
  const showAllRows = !paginate && !serverPagination
  const activePageSize = serverPagination
    ? serverPagination.pageSize
    : showAllRows
      ? Math.max(allRows.length, 1)
      : clientPageSize
  const totalRows = serverPagination ? serverPagination.totalCount : allRows.length
  const totalPages = Math.ceil(totalRows / activePageSize)
  const paginatedRows = serverPagination
    ? allRows
    : allRows.slice(activePageIndex * activePageSize, (activePageIndex + 1) * activePageSize)

  // Keep a client table on a real page when the row set shrinks underneath it.
  if (!serverPagination && pageIndex > 0 && pageIndex >= totalPages) {
    setPageIndex(Math.max(0, totalPages - 1))
  }

  const from = totalRows === 0 ? 0 : activePageIndex * activePageSize + 1
  const to = Math.min((activePageIndex + 1) * activePageSize, totalRows)

  function handlePageChange(newIndex: number) {
    if (serverPagination) serverPagination.onPageChange(newIndex)
    else setPageIndex(newIndex)
  }

  function handlePageSizeChange(newSize: number) {
    if (serverPagination) {
      serverPagination.onPageSizeChange?.(newSize)
    } else {
      setClientPageSize(newSize)
      setPageIndex(0)
    }
  }

  const sizeOptions = pageSizeOptions === false ? null : (pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS)
  const pageSizeSelectorVisible =
    sizeOptions != null && sizeOptions.length > 0 && (!serverPagination || serverPagination.onPageSizeChange != null)

  // ─── Download ───────────────────────────────────────────────────────────────
  const downloadConfig = useMemo<TableDownloadConfig<TData> | undefined>(() => {
    if (!download) return undefined
    const opts = download === true ? {} : download
    const exportColumns =
      opts.columns ??
      fullViewColumns
        .filter((c) => {
          const id = columnIdOf(c)
          return id && id !== ACTIONS_COLUMN_ID
        })
        .map((c) => {
          const key = columnIdOf(c)!
          const label = manifest.find((m) => m.key === key)?.label ?? key
          return {
            key,
            label,
            accessor: (row: TData) => {
              const v = columnValue(c, row, 0)
              if (v == null) return ""
              if (typeof v === "number" || typeof v === "string") return v
              if (typeof v === "boolean") return v ? "Yes" : "No"
              return toSearchText(v)
            },
          }
        })
    const exportPageSize = opts.pageSize ?? (serverPagination ? serverPagination.pageSize : activePageSize)
    const fetchPage =
      opts.fetchPage ??
      (async (pageNo: number, size: number) => {
        // Client tables export from the rows they hold; a server table without
        // a fetchPage can only export the page it has loaded.
        if (serverPagination) {
          return { items: pageNo === serverPagination.pageIndex + 1 ? data : [], totalCount: serverPagination.totalCount }
        }
        const rows = allRows.map((r) => r.original)
        return { items: rows.slice((pageNo - 1) * size, pageNo * size), totalCount: rows.length }
      })
    const fallbackTitle = typeof title === "string" ? title : undefined
    return {
      filename: opts.filename ?? (fallbackTitle ?? "export").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: opts.title ?? fallbackTitle,
      columns: exportColumns,
      fetchPage,
      currentPageNo: opts.currentPageNo ?? activePageIndex + 1,
      pageSize: exportPageSize,
    }
  }, [download, fullViewColumns, manifest, serverPagination, activePageSize, activePageIndex, allRows, data, title])

  const downloadTotal =
    serverPagination && download && download !== true && !download.fetchPage ? data.length : totalRows

  const fullViewTitle = fullViewConfig?.title ?? (typeof title === "string" ? title : undefined)

  return (
    <RowDetailsContext.Provider value={detailsEnabled ? openDetails : null}>
    <div className={className}>
      {filters && <TableFilters filters={filters} mode={filterMode} open={filtersOpen} onOpenChange={setFiltersOpen} />}
      <div className={cn("overflow-hidden", bordered && "rounded-xl border border-gray-200 bg-white")}>
        <TableCardHeader
          title={title}
          description={description}
          action={action}
          onRefresh={onRefresh}
          onSearch={onSearch || clientSearch ? handleSearch : undefined}
          showHeader={showHeader}
          showRefresh={showRefresh}
          download={downloadConfig}
          showSearch={showSearch}
          searchPlaceholder={searchPlaceholder}
          initialSearch={initialSearch}
          totalRows={downloadTotal}
          filterControl={filterControl}
          showFullView={!!fullViewConfig && managesColumns}
          onOpenFullView={() => changeFullViewOpen(true)}
          leadingInfo={
            columnsHint ? (
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                {columnsHint}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Why are some columns hidden?"
                        className="flex cursor-help items-center text-gray-400 transition-colors hover:text-gray-600"
                      >
                        <Info className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Columns that don’t fit the current width are hidden automatically to avoid horizontal scrolling.
                      Use “Columns” to choose or reorder them, or “Expand” to see them all.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
            ) : undefined
          }
          columnsControl={
            managesColumns ? (
              <ColumnManager
                manifest={manifest.filter((m) => allDataIds.includes(m.key))}
                order={prefs.order}
                hidden={prefs.hidden}
                autoHidden={autoHiddenIds}
                customized={prefs.customized}
                onReorder={prefs.setOrder}
                onToggle={prefs.toggle}
                onShowAll={prefs.showAll}
                onReset={prefs.reset}
              />
            ) : undefined
          }
        />

        <TableTopScrollbar wrapperRef={tableWrapperRef} />
        <div ref={tableWrapperRef} className="relative">
          {isRefetching && !isLoading && (
            <div className={cn("absolute right-0 left-0 z-10 h-0.5 overflow-hidden", sizeClasses.refetchTop)}>
              <div className="animate-table-refetch h-full w-[35%] bg-primary" />
            </div>
          )}
          <TooltipProvider delayDuration={300}>
            <Table data-table-size={tableSize} className={sizeClasses.table}>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                    {hg.headers.map((header) => {
                      const isAction = header.column.id === ACTIONS_COLUMN_ID
                      const isPinned = header.column.id === pinnedColumnId
                      return (
                        <TableHead
                          key={header.id}
                          data-col-id={header.column.id}
                          style={columnWidthStyle(header.column.columnDef)}
                          className={cn(
                            sizeClasses.head,
                            "text-xs font-medium text-gray-500",
                            isAction &&
                              "sticky right-0 z-10 border-l border-gray-200 bg-gray-50 px-2 text-center before:pointer-events-none before:absolute before:top-0 before:right-full before:bottom-0 before:w-4 before:bg-linear-to-l before:from-gray-900/8 before:to-transparent before:transition-opacity before:duration-200 before:content-['']",
                            isAction && (hasRightOverflow ? "before:opacity-100" : "before:opacity-0"),
                            isPinned &&
                              "sticky left-0 z-10 bg-gray-50 after:pointer-events-none after:absolute after:top-0 after:bottom-0 after:left-full after:w-4 after:bg-linear-to-r after:from-gray-900/8 after:to-transparent after:transition-opacity after:duration-200 after:content-['']",
                            isPinned && (hasLeftShadow ? "after:opacity-100" : "after:opacity-0")
                          )}
                        >
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows
                    columns={table.getVisibleLeafColumns()}
                    rowCount={Math.min(activePageSize, 12)}
                    rowHeightClass={rowHeightClass}
                    cellPaddingClass={cellPaddingClass}
                  />
                ) : paginatedRows.length ? (
                  paginatedRows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (event) => {
                              if (event.key !== "Enter" || event.target !== event.currentTarget) return
                              event.preventDefault()
                              onRowClick(row.original)
                            }
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                      className={cn(
                        "group/row border-b border-gray-200 transition-colors hover:bg-gray-50",
                        rowHeightClass,
                        rowClassName?.(row.original),
                        onRowClick &&
                          "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isAction = cell.column.id === ACTIONS_COLUMN_ID
                        const isPinned = cell.column.id === pinnedColumnId
                        return (
                          <TableCell
                            key={cell.id}
                            style={columnWidthStyle(cell.column.columnDef)}
                            onClick={isAction ? (event) => event.stopPropagation() : undefined}
                            className={cn(
                              cellPaddingClass,
                              "text-gray-700",
                              isAction &&
                                "sticky right-0 z-10 border-l border-gray-200 bg-white px-2 text-center group-hover/row:bg-gray-50 before:pointer-events-none before:absolute before:top-0 before:right-full before:bottom-0 before:w-4 before:bg-linear-to-l before:from-gray-900/8 before:to-transparent before:transition-opacity before:duration-200 before:content-['']",
                              isAction && (hasRightOverflow ? "before:opacity-100" : "before:opacity-0"),
                              isPinned &&
                                "sticky left-0 z-10 bg-white group-hover/row:bg-gray-50 after:pointer-events-none after:absolute after:top-0 after:bottom-0 after:left-full after:w-4 after:bg-linear-to-r after:from-gray-900/8 after:to-transparent after:transition-opacity after:duration-200 after:content-['']",
                              isPinned && (hasLeftShadow ? "after:opacity-100" : "after:opacity-0")
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={table.getVisibleLeafColumns().length}
                      className="p-0 text-center text-sm whitespace-normal text-gray-500"
                    >
                      {isError ? (
                        <TableErrorState message={errorMessageOf(error)} onRetry={onRefresh} />
                      ) : searchTerm && clientSearch ? (
                        <TableEmptyState title={`No results for “${searchTerm}”`} description="Try a different search term." />
                      ) : typeof empty === "string" ? (
                        <TableEmptyState title={empty} description="" />
                      ) : (
                        (empty ?? <TableEmptyState />)
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>

        {(isLoading || totalRows > 0) &&
          !(showAllRows && !isLoading) &&
          !(hidePaginationWhenSinglePage && !isLoading && totalPages <= 1) && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-4">
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400" role="status" aria-live="polite">
                    <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                    Loading...
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    Showing {from}–{to} of {totalRows} results
                  </p>
                )}
                {pageSizeSelectorVisible && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-300" aria-hidden>
                      •
                    </span>
                    <span className="text-xs text-gray-400">Rows per page</span>
                    <Select
                      value={String(activePageSize)}
                      onValueChange={(v) => handlePageSizeChange(Number(v))}
                      disabled={isLoading}
                    >
                      <SelectTrigger size="sm" className="h-8 w-17.5 scale-75 text-xs" aria-label={`Rows per page: ${activePageSize}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sizeOptions!.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(activePageIndex - 1)}
                  disabled={isLoading || activePageIndex === 0}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(activePageIndex + 1)}
                  disabled={isLoading || activePageIndex >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

        {fullViewConfig && managesColumns && (
          <TableFullViewDialog
            open={isFullViewOpen}
            onOpenChange={changeFullViewOpen}
            data={searchedData}
            columns={fullViewColumns}
            manifest={manifest}
            title={fullViewTitle}
            serverPagination={serverPagination}
            onRowClick={onRowClick}
            onRefresh={onRefresh}
            download={downloadConfig}
            totalRows={downloadTotal}
            isLoading={isLoading}
            isRefetching={isRefetching}
            rowClassName={rowClassName}
            prefs={prefs}
          />
        )}
      </div>
      {detailsEnabled && (!onRowClick || forceDetailsDrawer) && (
        <RowDetailsDrawer
          row={detailsRow}
          title={detailsTitle}
          labelOf={(id) => manifest.find((m) => m.key === id)?.label ?? id}
          onClose={() => setDetailsRowId(null)}
          record={typeof rowDetails === "object" ? rowDetails.record : undefined}
          load={typeof rowDetails === "object" ? rowDetails.load : undefined}
        />
      )}
    </div>
    </RowDetailsContext.Provider>
  )
}
