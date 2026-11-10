"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { Download, Maximize2, RotateCcw, Search, X } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TableDownloadModal, type TableDownloadConfig } from "@/components/ui/table-download"
import { TableSettings } from "@/components/ui/table-settings"
import { ToolbarActionButton } from "@/components/ui/toolbar-action-button"
import {
  resolveHeaderOrder,
  tableHeaderOrderPref,
  usePreference,
  type TableHeaderActionId,
} from "@/lib/table-preferences"
import { cn } from "@/lib/utils"

export type TableCardHeaderProps<TData> = {
  title?: React.ReactNode
  /** Optional subtitle under the title. */
  description?: React.ReactNode
  action?: React.ReactNode
  onRefresh?: () => void
  onSearch?: (term: string) => void
  /** Explicitly show/hide the entire header. Auto-derived when omitted. */
  showHeader?: boolean
  /** Defaults to `!!onRefresh`. */
  showRefresh?: boolean
  /** When provided, the download icon opens the export modal. */
  download?: TableDownloadConfig<TData>
  /** Defaults to `!!onSearch`. */
  showSearch?: boolean
  /** Placeholder for the search box. Default "Search...". */
  searchPlaceholder?: string
  /** Seed for the search box (e.g. a term already in the URL). */
  initialSearch?: string
  /** Row count passed to the download modal as `totalCount`. */
  totalRows: number
  /** Content under the title — `DataTable` uses it for the auto-fit hint. */
  leadingInfo?: React.ReactNode
  /** When true, shows an "Expand" icon that calls `onOpenFullView`. */
  showFullView?: boolean
  onOpenFullView?: () => void
  /** Slot for the "Columns" manager. */
  columnsControl?: React.ReactNode
  /** Live filter trigger (collapsible / dialog filter modes). */
  filterControl?: React.ReactNode
  /** Show the table-settings gear. Defaults to true. */
  showSettings?: boolean
}

/**
 * Card-header chrome (title, expanding search, refresh, filter, download,
 * columns, expand, settings) shared by `DataTable` and its full view.
 */
export function TableCardHeader<TData extends object>({
  title,
  description,
  action,
  onRefresh,
  onSearch,
  showHeader,
  showRefresh,
  download,
  showSearch,
  searchPlaceholder = "Search...",
  initialSearch = "",
  totalRows,
  showFullView = false,
  onOpenFullView,
  columnsControl,
  filterControl,
  leadingInfo,
  showSettings = true,
}: TableCardHeaderProps<TData>) {
  const refreshVisible = showRefresh ?? onRefresh != null
  const searchVisible = showSearch ?? onSearch != null
  const downloadVisible = download != null
  const headerHasContent =
    !!title ||
    !!description ||
    !!action ||
    refreshVisible ||
    searchVisible ||
    downloadVisible ||
    showFullView ||
    columnsControl != null ||
    filterControl != null ||
    leadingInfo != null
  const headerVisible = showHeader ?? headerHasContent

  const [isSearchOpen, setIsSearchOpen] = useState(!!initialSearch)
  const [searchValue, setSearchValue] = useState(initialSearch)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [storedActionOrder] = usePreference(tableHeaderOrderPref)
  const actionOrder = resolveHeaderOrder(storedActionOrder)

  // Debounced search: stop typing for a beat and it runs. Enter runs it now.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const timer = setTimeout(() => {
      if (isSearchOpen) onSearch?.(searchValue)
    }, 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  function openSearch() {
    setIsSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  function submitSearch() {
    setIsSearchOpen(true)
    onSearch?.(searchValue)
  }

  function closeSearch() {
    setIsSearchOpen(false)
    if (searchValue) onSearch?.("")
    setSearchValue("")
  }

  const actionNodes: Partial<Record<TableHeaderActionId, React.ReactNode>> = {
    refresh: refreshVisible ? (
      <ToolbarActionButton id="refresh" icon={RotateCcw} label="Refresh" onClick={onRefresh} />
    ) : undefined,
    filter: filterControl ?? undefined,
    download: downloadVisible ? (
      <ToolbarActionButton id="download" icon={Download} label="Download" onClick={() => setDownloadOpen(true)} />
    ) : undefined,
    columns: columnsControl ?? undefined,
    expand: showFullView ? (
      <ToolbarActionButton id="expand" icon={Maximize2} label="Expand" onClick={onOpenFullView} />
    ) : undefined,
  }

  return (
    <>
      {headerVisible && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-5">
          {title || description != null || leadingInfo != null ? (
            <div className="flex min-w-0 flex-col gap-0.5">
              {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
              {description != null && <p className="text-sm text-gray-500">{description}</p>}
              {leadingInfo}
            </div>
          ) : (
            <div />
          )}
          <div className="flex min-h-10 flex-wrap items-center gap-2">
            {action && <div className="flex items-center gap-2">{action}</div>}
            <TooltipProvider delayDuration={1500}>
              {searchVisible && (
                <div
                  className="flex items-center overflow-hidden rounded-md border border-gray-300 bg-white shadow-xs transition-[width] duration-300 ease-in-out"
                  style={{ width: isSearchOpen ? "13rem" : "2.25rem", height: 36 }}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    aria-label="Search the table"
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") closeSearch()
                      if (e.key === "Enter") {
                        e.preventDefault()
                        submitSearch()
                      }
                    }}
                    className={cn(
                      "min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400",
                      "transition-opacity duration-150",
                      isSearchOpen ? "pl-3 opacity-100" : "pointer-events-none pl-0 opacity-0"
                    )}
                  />
                  <button
                    type="button"
                    aria-label={isSearchOpen ? "Close search" : "Search the table"}
                    aria-expanded={isSearchOpen}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center justify-center text-gray-700 transition-colors hover:bg-gray-50",
                      isSearchOpen ? "h-full w-9" : "h-full w-full"
                    )}
                    onClick={() => (isSearchOpen ? closeSearch() : openSearch())}
                  >
                    {isSearchOpen ? <X size={15} /> : <Search size={15} />}
                  </button>
                </div>
              )}
              {actionOrder.map((id) => {
                const node = actionNodes[id]
                return node ? <Fragment key={id}>{node}</Fragment> : null
              })}
              {showSettings && <TableSettings />}
            </TooltipProvider>
          </div>
        </div>
      )}

      {download != null && (
        <TableDownloadModal open={downloadOpen} onOpenChange={setDownloadOpen} config={download} totalCount={totalRows} />
      )}
    </>
  )
}
