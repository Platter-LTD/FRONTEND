"use client"

import { useCallback, useMemo, useState } from "react"
import {
  tableLayoutNamespace,
  tableRememberLayoutsPref,
  useNamespacePreference,
  usePreference,
  type TableLayoutValue,
} from "@/lib/table-preferences"
import { isCustomized, reconcilePrefs, visibilityFromHidden } from "@/lib/table-column-prefs"

export type TableColumnPrefs = {
  /** Data-column ids in display order (actions column excluded). */
  order: string[]
  /** Data-column ids the user has hidden. */
  hidden: string[]
  /** VisibilityState derived from `hidden`. */
  visibility: ReturnType<typeof visibilityFromHidden>
  /** True when order/visibility differ from the declared default. */
  customized: boolean
  setOrder: (order: string[]) => void
  /** Toggle a column's visibility. Refuses to hide the last visible column. */
  toggle: (id: string) => void
  /** Un-hide every column (order unchanged). */
  showAll: () => void
  /** Restore declared order and default visibility. */
  reset: () => void
}

const EMPTY_LAYOUT: TableLayoutValue = { order: [], hidden: [] }
const NO_IDS: string[] = []

/**
 * Column display preferences (order + visibility) for a table. With a
 * `storageKey` (the table id) and "remember layouts" on, changes persist per
 * browser; otherwise they live for the session. Stored values are reconciled
 * against the current column set, so added/removed columns are handled.
 */
export function useTableColumnPrefs({
  storageKey,
  allIds,
  defaultHidden = NO_IDS,
}: {
  storageKey?: string
  allIds: string[]
  defaultHidden?: string[]
}): TableColumnPrefs {
  const [remember] = usePreference(tableRememberLayoutsPref)
  const [stored, setStored, resetStored] = useNamespacePreference(
    tableLayoutNamespace,
    storageKey ?? "__ephemeral__"
  )
  const [session, setSession] = useState<TableLayoutValue>(EMPTY_LAYOUT)

  const persist = !!storageKey && remember
  const raw = persist ? stored : session

  const allIdsSig = `${allIds.join("|")}#${defaultHidden.join("|")}`
  const prefs = useMemo(
    () => reconcilePrefs(raw, allIds, defaultHidden),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, allIdsSig]
  )
  const visibility = useMemo(() => visibilityFromHidden(prefs.hidden), [prefs.hidden])
  const customized = useMemo(
    () => isCustomized(prefs, allIds, defaultHidden),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefs, allIdsSig]
  )

  // Persist only genuinely-customized layouts; revert-to-default removes the entry.
  const write = useCallback(
    (patch: Partial<TableLayoutValue>) => {
      const next: TableLayoutValue = {
        order: patch.order ?? prefs.order,
        hidden: patch.hidden ?? prefs.hidden,
      }
      if (persist) {
        if (isCustomized(next, allIds, defaultHidden)) setStored(next)
        else resetStored()
      } else {
        setSession(next)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persist, allIdsSig, setStored, resetStored, prefs.order, prefs.hidden]
  )

  const setOrder = useCallback((order: string[]) => write({ order }), [write])

  const toggle = useCallback(
    (id: string) => {
      if (!prefs.hidden.includes(id)) {
        if (allIds.length - prefs.hidden.length <= 1) return // never hide the last one
        write({ hidden: [...prefs.hidden, id] })
      } else {
        write({ hidden: prefs.hidden.filter((x) => x !== id) })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [write, prefs.hidden, allIdsSig]
  )

  const showAll = useCallback(() => write({ hidden: [] }), [write])

  const reset = useCallback(() => {
    if (persist) resetStored()
    else setSession(EMPTY_LAYOUT)
  }, [persist, resetStored])

  return {
    order: prefs.order,
    hidden: prefs.hidden,
    visibility,
    customized,
    setOrder,
    toggle,
    showAll,
    reset,
  }
}
