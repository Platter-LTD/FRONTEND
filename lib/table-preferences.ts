"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * Per-user table preferences (size, density, filter mode, scrollbar position,
 * header labels/order, remembered column layouts), persisted in localStorage.
 *
 * A trimmed port of bankone-web's preferences engine: same keys and defaults,
 * same `[value, set, reset]` handle, but without the registry/scope/versioning
 * layers this app has no use for yet. Every tab listening on the same key stays
 * in sync (the `storage` event covers other tabs, `emit` covers this one).
 */

const STORAGE_PREFIX = "pref."

type Listener = () => void
const listeners = new Set<Listener>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(cb: Listener) {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => {
    if (e.key == null || e.key.startsWith(STORAGE_PREFIX)) cb()
  }
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(cb)
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage)
  }
}

function read(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value == null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Private mode / blocked storage: the preference just won't persist.
  }
  emit()
}

// Snapshot cache keeps useSyncExternalStore's getSnapshot referentially stable
// while the stored string is unchanged (re-parsing returns a fresh object).
const cache = new Map<string, { raw: string | null; value: unknown }>()

export type PreferenceDef<T> = {
  path: string
  default: T
  /** Reject a stored value that no longer fits (falls back to the default). */
  validate?: (value: unknown) => value is T
}

function snapshot<T>(def: PreferenceDef<T>, key: string): T {
  const raw = read(key)
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return hit.value as T
  let value: T = def.default
  if (raw != null) {
    try {
      const parsed = JSON.parse(raw) as unknown
      value = !def.validate || def.validate(parsed) ? (parsed as T) : def.default
    } catch {
      value = def.default
    }
  }
  cache.set(key, { raw, value })
  return value
}

export type PreferenceHandle<T> = readonly [value: T, set: (next: T) => void, reset: () => void]

function usePreferenceAt<T>(def: PreferenceDef<T>, key: string): PreferenceHandle<T> {
  const value = useSyncExternalStore(
    subscribe,
    () => snapshot(def, key),
    () => def.default
  )
  const set = useCallback((next: T) => write(key, JSON.stringify(next)), [key])
  const reset = useCallback(() => write(key, null), [key])
  return [value, set, reset] as const
}

/** Read/write a single statically-keyed preference. */
export function usePreference<T>(def: PreferenceDef<T>): PreferenceHandle<T> {
  return usePreferenceAt(def, STORAGE_PREFIX + def.path)
}

/** Read/write one entry of a dynamically-keyed namespace (e.g. a table's layout). */
export function useNamespacePreference<T>(def: PreferenceDef<T>, id: string): PreferenceHandle<T> {
  return usePreferenceAt(def, `${STORAGE_PREFIX}${def.path}.${id}`)
}

const oneOf =
  <T extends string>(...values: T[]) =>
  (v: unknown): v is T =>
    typeof v === "string" && (values as string[]).includes(v)

// ─── Definitions ──────────────────────────────────────────────────────────────

export type TableSizeValue = "small" | "medium" | "large"
export type TableDensityValue = "comfortable" | "compact"
export type TableFilterMode = "inline" | "collapsible" | "modal"

/** Overall table scale: text size, cell padding, and header/row height. */
export const tableSizePref: PreferenceDef<TableSizeValue> = {
  path: "table.size",
  default: "small",
  validate: oneOf("small", "medium", "large"),
}

/** Default row density for all tables. Overridable per table. */
export const tableDensityPref: PreferenceDef<TableDensityValue> = {
  path: "table.density",
  default: "comfortable",
  validate: oneOf("comfortable", "compact"),
}

/** Show filters above the table, collapse them behind a toggle, or open them in a dialog. */
export const tableFilterModePref: PreferenceDef<TableFilterMode> = {
  path: "table.filterMode",
  default: "inline",
  validate: oneOf("inline", "collapsible", "modal"),
}

/** Where a wide table's horizontal scrollbar sits. */
export const tableScrollbarPositionPref: PreferenceDef<"bottom" | "top"> = {
  path: "table.scrollbarPosition",
  default: "bottom",
  validate: oneOf("bottom", "top"),
}

/** Whether per-table column layouts (order + visibility) are remembered. */
export const tableRememberLayoutsPref: PreferenceDef<boolean> = {
  path: "table.rememberLayouts",
  default: true,
  validate: (v): v is boolean => typeof v === "boolean",
}

/** Whether the collapsible filter bar is currently expanded. */
export const tableFiltersExpandedPref: PreferenceDef<boolean> = {
  path: "table.filtersExpanded",
  default: false,
  validate: (v): v is boolean => typeof v === "boolean",
}

export type TableHeaderActionId = "refresh" | "filter" | "download" | "columns" | "expand"

/** Configurable toolbar actions, in their default left-to-right order. */
export const TABLE_HEADER_ACTIONS: { id: TableHeaderActionId; label: string }[] = [
  { id: "refresh", label: "Refresh" },
  { id: "filter", label: "Filters" },
  { id: "download", label: "Download" },
  { id: "columns", label: "Columns" },
  { id: "expand", label: "Expand" },
]

const DEFAULT_HEADER_ORDER = TABLE_HEADER_ACTIONS.map((a) => a.id)

/** User's left-to-right order for the toolbar actions. */
export const tableHeaderOrderPref: PreferenceDef<string[]> = {
  path: "table.header.order",
  default: DEFAULT_HEADER_ORDER,
  validate: (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string"),
}

/**
 * Reconcile a stored order against the known actions: drop ids that no longer
 * exist and insert any missing action at its declared default position.
 */
export function resolveHeaderOrder(stored: string[]): TableHeaderActionId[] {
  const known = new Set<string>(DEFAULT_HEADER_ORDER)
  const kept = stored.filter((id): id is TableHeaderActionId => known.has(id))
  const missing = DEFAULT_HEADER_ORDER.filter((id) => !kept.includes(id))
  const out = [...kept]
  for (const id of missing) out.splice(DEFAULT_HEADER_ORDER.indexOf(id), 0, id)
  return out
}

/** Which header toolbar buttons show their text label (vs. icon-only). */
export const tableHeaderLabelsPref: PreferenceDef<Record<string, boolean>> = {
  path: "table.header.labels",
  default: {},
  validate: (v): v is Record<string, boolean> => typeof v === "object" && v != null && !Array.isArray(v),
}

export function showTableHeaderLabel(labels: Record<string, boolean>, id: TableHeaderActionId) {
  return labels[id] === true
}

/** Per-table column layout — one entry per `tableId`. */
export type TableLayoutValue = { order: string[]; hidden: string[] }

export const tableLayoutNamespace: PreferenceDef<TableLayoutValue> = {
  path: "table.layout",
  default: { order: [], hidden: [] },
  validate: (v): v is TableLayoutValue =>
    typeof v === "object" &&
    v != null &&
    Array.isArray((v as TableLayoutValue).order) &&
    Array.isArray((v as TableLayoutValue).hidden),
}
