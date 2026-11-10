import type { ColumnDef, RowData, VisibilityState } from "@tanstack/react-table"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Plain-text label for the column picker / export when `header` is not a string. */
    label?: string
    /** Starts unticked in the column picker. */
    defaultHidden?: boolean
  }
}

/** Id of the sticky row-actions column — always kept last and never reordered/hidden. */
export const ACTIONS_COLUMN_ID = "actions"

/**
 * A table's user column preferences: the display order of the data columns and
 * which of them are hidden. Shared between the compact table and its full-view
 * dialog. The sticky actions column is excluded from both lists.
 */
export type ColumnPrefs = {
  order: string[]
  hidden: string[]
}

/** The id TanStack resolves a column to: its explicit `id`, else its `accessorKey`. */
export function columnIdOf<TData>(column: ColumnDef<TData, unknown>): string | undefined {
  if (column.id) return column.id
  const accessorKey = (column as { accessorKey?: unknown }).accessorKey
  return typeof accessorKey === "string" ? accessorKey : undefined
}

/** Data-column ids of a column set, in declared order, excluding the actions column. */
export function dataColumnIdsOf<TData>(columns: ColumnDef<TData, unknown>[]): string[] {
  return columns.map(columnIdOf).filter((id): id is string => !!id && id !== ACTIONS_COLUMN_ID)
}

/**
 * Picker labels for a column set: `meta.label`, else a string `header`, else
 * the id turned into words ("createdAt" → "Created At").
 */
export function columnManifestOf<TData>(
  columns: ColumnDef<TData, unknown>[]
): { key: string; label: string }[] {
  return columns
    .map((c) => {
      const key = columnIdOf(c)
      if (!key || key === ACTIONS_COLUMN_ID) return null
      const label =
        c.meta?.label ?? (typeof c.header === "string" && c.header ? c.header : humanize(key))
      return { key, label }
    })
    .filter((x): x is { key: string; label: string } => x != null)
}

export function humanize(key: string): string {
  return key
    .replace(/[_.-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Reorder a column set by `order`. Ids in `order` come first (in that order);
 * columns not named keep their declared order after them; the actions column,
 * if present, is always last. Unknown ids are ignored.
 */
export function applyColumnOrder<TData>(
  columns: ColumnDef<TData, unknown>[],
  order: string[]
): ColumnDef<TData, unknown>[] {
  const byId = new Map(columns.map((c) => [columnIdOf(c), c]))
  const seen = new Set<string>()
  const out: ColumnDef<TData, unknown>[] = []
  for (const id of order) {
    if (id === ACTIONS_COLUMN_ID || seen.has(id)) continue
    const col = byId.get(id)
    if (col) {
      out.push(col)
      seen.add(id)
    }
  }
  for (const col of columns) {
    const id = columnIdOf(col)
    if (id === ACTIONS_COLUMN_ID || (id && seen.has(id))) continue
    out.push(col)
    if (id) seen.add(id)
  }
  const actions = columns.find((c) => columnIdOf(c) === ACTIONS_COLUMN_ID)
  if (actions) out.push(actions)
  return out
}

/**
 * Decide which of `orderedIds` fit in `available` px and return a
 * VisibilityState hiding the rest. The visible set is a contiguous prefix —
 * order is priority. `actionsWidth` is reserved for the sticky actions column;
 * at least one data column is always kept.
 */
export function computeAutoFitVisibility(
  orderedIds: string[],
  widths: Map<string, number>,
  available: number,
  actionsWidth = 0
): VisibilityState {
  let used = actionsWidth
  let shown = 0
  let cutOff = false
  const hidden: VisibilityState = {}
  for (const id of orderedIds) {
    const width = widths.get(id) ?? 0
    if (!cutOff && (shown === 0 || used + width <= available)) {
      used += width
      shown += 1
    } else {
      cutOff = true
      hidden[id] = false
    }
  }
  return hidden
}

/**
 * How a column in the picker is presented: `visible`, `hidden` (switched off by
 * the user), or `offscreen` (on, but auto-fit is dropping it for width).
 */
export type ColumnDisplayState = "visible" | "hidden" | "offscreen"

export function columnDisplayState(
  id: string,
  hidden: ReadonlySet<string>,
  autoHidden: ReadonlySet<string>
): ColumnDisplayState {
  if (hidden.has(id)) return "hidden"
  if (autoHidden.has(id)) return "offscreen"
  return "visible"
}

/** VisibilityState marking each id in `hidden` as `false`. */
export function visibilityFromHidden(hidden: string[]): VisibilityState {
  return Object.fromEntries(hidden.map((id) => [id, false]))
}

/** Move `dragId` to just before / just after `targetId` (pure). */
export function moveColumnTo(
  order: string[],
  dragId: string,
  targetId: string,
  position: "before" | "after"
): string[] {
  if (dragId === targetId) return order
  const without = order.filter((id) => id !== dragId)
  let idx = without.indexOf(targetId)
  if (idx === -1) return order
  if (position === "after") idx += 1
  return [...without.slice(0, idx), dragId, ...without.slice(idx)]
}

/** Whether prefs differ from the declared default — drives the "Reset" affordance. */
export function isCustomized(
  prefs: ColumnPrefs,
  declaredOrder: string[],
  defaultHidden: readonly string[] = []
): boolean {
  if (prefs.hidden.length !== defaultHidden.length) return true
  if (prefs.hidden.some((id) => !defaultHidden.includes(id))) return true
  if (prefs.order.length !== declaredOrder.length) return true
  return prefs.order.some((id, i) => id !== declaredOrder[i])
}

/**
 * Reconcile stored prefs against the current column set: drop ids that no
 * longer exist, append new columns at the end, keep only valid hidden ids.
 */
export function reconcilePrefs(
  stored: ColumnPrefs,
  declaredOrder: string[],
  defaultHidden: readonly string[] = []
): ColumnPrefs {
  const valid = new Set(declaredOrder)
  const order = stored.order.filter((id) => valid.has(id))
  const inOrder = new Set(order)
  const hidden = stored.hidden.filter((id) => valid.has(id))
  for (const id of declaredOrder) {
    if (inOrder.has(id)) continue
    order.push(id)
    if (defaultHidden.includes(id) && !hidden.includes(id)) hidden.push(id)
  }
  return { order, hidden }
}
