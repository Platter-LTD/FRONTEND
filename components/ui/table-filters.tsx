"use client"

import { ChevronDown, ListFilter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { TableFilterMode } from "@/lib/table-preferences"
import { cn } from "@/lib/utils"

/**
 * A list page's filter bar, handed to `DataTable` so the table shell can decide
 * how to present it (inline, collapsible, or in a dialog). Pages own the
 * *fields*; the Apply/Clear row is owned here.
 */
export type TableFiltersConfig = {
  /** The filter fields only — no Apply/Reset row. */
  content: React.ReactNode
  /** How many filters are currently applied. Drives the badge and summary. */
  activeCount?: number
  /** Commit the draft filters. Return `false` to keep the dialog open. */
  onApply?: () => boolean | void
  /** Clear every filter back to unset. */
  onClear?: () => void
}

function FiltersCard({
  children,
  className,
  onKeyDown,
}: {
  children: React.ReactNode
  className?: string
  onKeyDown?: (event: React.KeyboardEvent) => void
}) {
  return (
    <div
      onKeyDown={onKeyDown}
      className={cn("flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4", className)}
    >
      {children}
    </div>
  )
}

/** Enter inside a filter field applies the filters (skips buttons, selects, textareas). */
function applyOnEnter(onApply?: () => void) {
  if (!onApply) return undefined
  return (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" || event.defaultPrevented) return
    const target = event.target as HTMLElement | null
    if (!target || target instanceof HTMLTextAreaElement) return
    if (target.closest("button,[role='combobox'],[role='listbox'],[role='option']")) return
    event.preventDefault()
    onApply()
  }
}

function FilterActions({
  onApply,
  onClear,
  hasActive,
  split,
}: {
  onApply?: () => void
  onClear?: () => void
  hasActive: boolean
  split?: boolean
}) {
  if (!onApply && !onClear) return null
  return (
    <div className={cn("relative flex gap-2 bg-white", split ? "justify-between" : "justify-end")}>
      {onClear && (
        <Button type="button" size="sm" variant="outline" onClick={onClear} disabled={!hasActive && split}>
          {split ? "Clear all" : "Reset"}
        </Button>
      )}
      {onApply && (
        <Button type="button" size="sm" onClick={onApply}>
          <Search className="mr-1 size-4" /> Apply
        </Button>
      )}
    </div>
  )
}

/** Reassures the user what's applied when the fields themselves aren't on screen. */
export function ActiveFilterSummary({ activeCount, onClear }: { activeCount: number; onClear?: () => void }) {
  if (activeCount <= 0) return null
  return (
    <div className="mb-3 flex items-center gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
        <ListFilter className="size-3" />
        {activeCount} filter{activeCount === 1 ? "" : "s"} applied
      </span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer rounded px-1.5 py-0.5 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

/**
 * Renders the filter bar for the current mode.
 * - `inline` — above the table.
 * - `collapsible` — same card, revealed by the toolbar Filter button (grid-rows 0fr→1fr animation).
 * - `modal` — in a dialog; Apply and Clear both close it.
 */
export function TableFilters({
  filters,
  mode,
  open,
  onOpenChange,
}: {
  filters: TableFiltersConfig
  mode: TableFilterMode
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const activeCount = filters.activeCount ?? 0
  const actions = (split?: boolean) => (
    <FilterActions onApply={filters.onApply} onClear={filters.onClear} hasActive={activeCount > 0} split={split} />
  )

  if (mode === "inline") {
    return (
      <FiltersCard className="mb-4" onKeyDown={applyOnEnter(filters.onApply)}>
        {filters.content}
        {actions()}
      </FiltersCard>
    )
  }

  if (mode === "collapsible") {
    return (
      <>
        <ActiveFilterSummary activeCount={activeCount} onClear={filters.onClear} />
        <div
          aria-hidden={!open}
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <FiltersCard className="mb-4" onKeyDown={applyOnEnter(filters.onApply)}>
              {filters.content}
              {actions()}
            </FiltersCard>
          </div>
        </div>
      </>
    )
  }

  const close = () => onOpenChange(false)
  const applyAndClose = filters.onApply
    ? () => {
        if (filters.onApply?.() === false) return
        close()
      }
    : undefined
  return (
    <>
      <ActiveFilterSummary activeCount={activeCount} onClear={filters.onClear} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <div className="border-b border-gray-200 py-4 pr-14 pl-6">
            <DialogTitle className="text-base font-medium text-gray-900">Filters</DialogTitle>
            <DialogDescription className="sr-only">Narrow the rows shown in the table.</DialogDescription>
          </div>
          <div onKeyDown={applyOnEnter(applyAndClose)} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {filters.content}
          </div>
          {(filters.onApply || filters.onClear) && (
            <div className="border-t border-gray-200 px-6 py-4">
              <FilterActions
                onApply={applyAndClose}
                onClear={
                  filters.onClear &&
                  (() => {
                    filters.onClear?.()
                    close()
                  })
                }
                hasActive={activeCount > 0}
                split
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Toolbar trigger for the collapsible / dialog modes, badged with the active count. */
export function FilterTriggerButton({
  activeCount,
  open,
  mode,
  onClick,
  labelled,
}: {
  activeCount: number
  open: boolean
  mode: "collapsible" | "modal"
  onClick: () => void
  labelled: boolean
}) {
  const showBadge = activeCount > 0
  const showChevron = mode === "collapsible"
  const compact = !labelled && !showBadge && !showChevron

  const button = (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "default"}
      onClick={onClick}
      aria-label="Filters"
      aria-expanded={showChevron ? open : undefined}
      className={cn(
        "group text-gray-700",
        !compact && "gap-1.5 px-2.5",
        showBadge && "border-primary/40 text-primary"
      )}
    >
      <ListFilter />
      {labelled && "Filters"}
      {showBadge && (
        <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] leading-none font-semibold text-primary-foreground">
          {activeCount}
        </span>
      )}
      {showChevron && (
        <span className="ml-0.5 flex items-center gap-1.5">
          <span aria-hidden className="h-3.5 w-px bg-gray-200 transition-colors group-hover:bg-gray-300" />
          <ChevronDown
            aria-hidden
            className={cn(
              "text-gray-400 transition-[transform,color] duration-200 group-hover:text-gray-600",
              open && "rotate-180"
            )}
          />
        </span>
      )}
    </Button>
  )

  if (labelled && !showBadge) return button

  const verb = showChevron ? (open ? "Hide filters" : "Show filters") : "Filters"
  return (
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{showBadge ? `${verb} · ${activeCount} applied` : verb}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
