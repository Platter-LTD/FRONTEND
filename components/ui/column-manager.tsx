"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Columns3, EyeOff, GripVertical, RotateCcw, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { tableHeaderLabelsPref, usePreference } from "@/lib/table-preferences"
import { columnDisplayState, moveColumnTo } from "@/lib/table-column-prefs"
import { cn } from "@/lib/utils"

type ColumnManifest = { key: string; label: string }

type ColumnManagerProps = {
  /** Label list for every data column. */
  manifest: ColumnManifest[]
  /** Current data-column order (ids). */
  order: string[]
  /** Currently hidden data-column ids. */
  hidden: string[]
  /** Ids kept ON by the user that auto-fit is dropping for want of width. */
  autoHidden?: string[]
  /** True when prefs differ from the declared default (enables "Reset"). */
  customized: boolean
  onReorder: (order: string[]) => void
  onToggle: (id: string) => void
  onShowAll: () => void
  onReset: () => void
  /** Portal target for the popover — pass a node inside a dialog so the list scrolls. */
  container?: HTMLElement | null
}

/**
 * "Columns" control: a popover for choosing which columns show and in what
 * order. Checkbox shows/hides; the grip handle drags (or arrow-keys) to
 * reorder. A search box filters long lists (reordering pauses while filtered).
 */
export function ColumnManager({
  manifest,
  order,
  hidden,
  autoHidden,
  customized,
  onReorder,
  onToggle,
  onShowAll,
  onReset,
  container,
}: ColumnManagerProps) {
  const [query, setQuery] = useState("")
  const [headerLabels] = usePreference(tableHeaderLabelsPref)
  const labelled = headerLabels["columns"] === true

  const labelById = useMemo(() => new Map(manifest.map((c) => [c.key, c.label])), [manifest])
  const hiddenSet = useMemo(() => new Set(hidden), [hidden])
  const visibleCount = manifest.length - manifest.filter((c) => hiddenSet.has(c.key)).length
  const autoHiddenSet = useMemo(
    () => new Set((autoHidden ?? []).filter((id) => !hiddenSet.has(id))),
    [autoHidden, hiddenSet]
  )
  const orderedKeys = order.filter((id) => labelById.has(id))
  const reorderable = query.trim() === ""

  return (
    <Popover>
      {labelled ? (
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" aria-label="Columns" className="text-gray-700">
            <Columns3 className="size-4" />
            Columns
            <span className="text-gray-400">
              {visibleCount}/{manifest.length}
            </span>
          </Button>
        </PopoverTrigger>
      ) : (
        <TooltipProvider delayDuration={600}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="Columns" className="text-gray-700">
                  <Columns3 className="size-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              Columns · {visibleCount}/{manifest.length}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <PopoverContent align="end" container={container} className="w-72 p-0">
        <div className="border-b border-gray-200 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search columns"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-2 py-1.5">
          <button
            type="button"
            onClick={onShowAll}
            className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/5"
          >
            Show all
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!customized}
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
              customized ? "cursor-pointer text-gray-600 hover:bg-gray-50" : "cursor-not-allowed text-gray-300"
            )}
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        </div>

        <ColumnOrderList
          ids={orderedKeys}
          order={order}
          labelById={labelById}
          hidden={hiddenSet}
          autoHidden={autoHiddenSet}
          query={query}
          onReorder={onReorder}
          onToggle={onToggle}
          aria-label="Columns"
          className="max-h-72"
        />

        {!reorderable && (
          <div className="border-t border-gray-200 px-3 py-1.5 text-xs text-gray-400">
            Clear the search to reorder columns.
          </div>
        )}

        {autoHiddenSet.size > 0 && (
          <div className="flex items-start gap-1.5 border-t border-gray-200 px-3 py-2 text-xs text-gray-400">
            <EyeOff aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {`${autoHiddenSet.size} column${autoHiddenSet.size === 1 ? "" : "s"} won’t fit at this width. Reorder to prioritise, or use Expand.`}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

const OFFSCREEN_HINT = "On, but doesn’t fit at this width — it shows when there’s room, or in full view"

/**
 * The reorderable column list behind the "Columns" popover. A checkbox toggles
 * a column; the grip rail reorders it by drag or, when focused, by the up/down
 * arrow keys. Owns its scroll container so a drag can auto-scroll it.
 */
function ColumnOrderList({
  ids,
  order,
  labelById,
  hidden,
  autoHidden,
  query = "",
  onReorder,
  onToggle,
  className,
  "aria-label": ariaLabel,
}: {
  ids: string[]
  order: string[]
  labelById: ReadonlyMap<string, string>
  hidden: ReadonlySet<string>
  autoHidden: ReadonlySet<string>
  query?: string
  onReorder: (order: string[]) => void
  onToggle: (id: string) => void
  className?: string
  "aria-label"?: string
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overBefore, setOverBefore] = useState(true)

  const visibleCount = ids.filter((id) => !hidden.has(id)).length
  const q = query.trim().toLowerCase()
  const reorderable = q === ""
  const rows = reorderable ? ids : ids.filter((id) => (labelById.get(id) ?? "").toLowerCase().includes(q))

  // Native HTML5 drag doesn't scroll a container at its edge; hovering near the
  // top/bottom runs a rAF loop that scrolls, faster the closer to the edge.
  const listRef = useRef<HTMLDivElement>(null)
  const scrollSpeedRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const EDGE_PX = 40
  const MAX_SPEED = 14

  function stopAutoScroll() {
    scrollSpeedRef.current = 0
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  function runAutoScroll() {
    const el = listRef.current
    if (el && scrollSpeedRef.current !== 0) el.scrollTop += scrollSpeedRef.current
    rafRef.current = requestAnimationFrame(runAutoScroll)
  }

  function updateAutoScroll(clientY: number) {
    const el = listRef.current
    if (!el) return
    const { top, bottom } = el.getBoundingClientRect()
    const fromTop = clientY - top
    const fromBottom = bottom - clientY
    if (fromTop < EDGE_PX) {
      scrollSpeedRef.current = -Math.ceil(MAX_SPEED * (1 - Math.max(fromTop, 0) / EDGE_PX))
    } else if (fromBottom < EDGE_PX) {
      scrollSpeedRef.current = Math.ceil(MAX_SPEED * (1 - Math.max(fromBottom, 0) / EDGE_PX))
    } else {
      scrollSpeedRef.current = 0
    }
    if (scrollSpeedRef.current !== 0 && rafRef.current == null) {
      rafRef.current = requestAnimationFrame(runAutoScroll)
    }
  }

  useEffect(() => stopAutoScroll, [])

  function clearDrag() {
    setDragId(null)
    setOverId(null)
    stopAutoScroll()
  }

  return (
    <div
      ref={listRef}
      role="list"
      aria-label={ariaLabel}
      onDragOver={(e) => {
        if (!reorderable || !dragId) return
        e.preventDefault()
        updateAutoScroll(e.clientY)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        stopAutoScroll()
      }}
      onDrop={stopAutoScroll}
      className={cn("overflow-y-auto p-1", className)}
    >
      {rows.map((id) => {
        const label = labelById.get(id) ?? id
        const state = columnDisplayState(id, hidden, autoHidden)
        const checked = state !== "hidden"
        const isLastVisible = checked && visibleCount <= 1
        const isDragging = dragId === id
        const isTarget = reorderable && dragId != null && overId === id && !isDragging
        return (
          <div
            key={id}
            role="listitem"
            data-row-id={id}
            draggable={reorderable}
            onDragStart={(e) => {
              if (!reorderable) return
              setDragId(id)
              e.dataTransfer.effectAllowed = "move"
            }}
            onDragEnd={clearDrag}
            onDragOver={(e) => {
              if (!reorderable || !dragId) return
              e.preventDefault()
              e.dataTransfer.dropEffect = "move"
              const rect = e.currentTarget.getBoundingClientRect()
              const before = e.clientY < rect.top + rect.height / 2
              if (overId !== id || overBefore !== before) {
                setOverId(id)
                setOverBefore(before)
              }
            }}
            onDrop={(e) => {
              if (!reorderable || !dragId) return
              e.preventDefault()
              if (dragId !== id) onReorder(moveColumnTo(order, dragId, id, overBefore ? "before" : "after"))
              clearDrag()
            }}
            className={cn(
              "relative flex items-stretch gap-1.5 rounded-md py-2 pl-2 text-sm text-gray-700 transition-colors",
              reorderable && "cursor-grab hover:bg-gray-50 active:cursor-grabbing",
              isDragging && "opacity-40"
            )}
          >
            {isTarget && (
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-primary",
                  "before:absolute before:top-1/2 before:left-0 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-primary before:content-['']",
                  overBefore ? "-top-px" : "-bottom-px"
                )}
              />
            )}
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
              <Checkbox
                checked={checked}
                disabled={isLastVisible}
                onCheckedChange={() => onToggle(id)}
                aria-label={`Show ${label}`}
              />
              <span className="line-clamp-1">{label}</span>
            </label>
            {state === "offscreen" && (
              <span title={OFFSCREEN_HINT} className="flex shrink-0 items-center text-gray-300">
                <EyeOff aria-hidden className="size-3.5" />
                <span className="sr-only">Not shown at this width</span>
              </span>
            )}
            <span
              role={reorderable ? "button" : undefined}
              tabIndex={reorderable ? 0 : -1}
              aria-label={reorderable ? `Reorder ${label}. Press the up or down arrow key to move it.` : undefined}
              aria-disabled={!reorderable}
              onKeyDown={(e) => {
                if (!reorderable) return
                if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return
                e.preventDefault()
                const pos = order.indexOf(id)
                const target = e.key === "ArrowUp" ? pos - 1 : pos + 1
                if (pos === -1 || target < 0 || target >= order.length) return
                onReorder(moveColumnTo(order, id, order[target], e.key === "ArrowUp" ? "before" : "after"))
                requestAnimationFrame(() => {
                  listRef.current?.querySelector<HTMLElement>(`[data-grip-id="${CSS.escape(id)}"]`)?.focus()
                })
              }}
              data-grip-id={id}
              className={cn(
                "ml-1 flex shrink-0 items-center self-stretch border-l border-gray-100 px-1.5 transition-colors outline-none",
                reorderable
                  ? "cursor-grab text-gray-300 hover:bg-gray-100 hover:text-gray-500 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset active:cursor-grabbing"
                  : "text-gray-200"
              )}
            >
              <GripVertical aria-hidden className="size-3.5" />
            </span>
          </div>
        )
      })}
      {rows.length === 0 && (
        <div className="px-2 py-6 text-center text-xs text-gray-400">
          {q ? `No columns match “${query}”.` : "No columns."}
        </div>
      )}
    </div>
  )
}
