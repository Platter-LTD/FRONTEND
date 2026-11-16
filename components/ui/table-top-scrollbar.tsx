"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import { tableScrollbarPositionPref, usePreference } from "@/lib/table-preferences"

/**
 * A horizontal scrollbar rendered above a table, kept in lockstep with the
 * table's own scroll container. Shown only when the user's scrollbar
 * preference is "top" and the table actually overflows. While active it marks
 * the container `data-scrollbar="top"`, which hides the native bottom bar.
 */
export function TableTopScrollbar({ wrapperRef }: { wrapperRef: RefObject<HTMLElement | null> }) {
  const [position] = usePreference(tableScrollbarPositionPref)
  const active = position === "top"
  const barRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    if (!active) return
    const scrollEl = wrapperRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
    if (!scrollEl) return

    scrollEl.dataset.scrollbar = "top"

    const measure = () => {
      setContentWidth(scrollEl.scrollWidth)
      setOverflows(scrollEl.scrollWidth - scrollEl.clientWidth > 1)
    }
    const fromTable = () => {
      const bar = barRef.current
      if (bar && bar.scrollLeft !== scrollEl.scrollLeft) bar.scrollLeft = scrollEl.scrollLeft
    }

    measure()
    scrollEl.addEventListener("scroll", fromTable, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(scrollEl)
    if (scrollEl.firstElementChild) ro.observe(scrollEl.firstElementChild)

    return () => {
      delete scrollEl.dataset.scrollbar
      scrollEl.removeEventListener("scroll", fromTable)
      ro.disconnect()
    }
  }, [active, wrapperRef])

  useEffect(() => {
    const bar = barRef.current
    const scrollEl = wrapperRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
    if (bar && scrollEl) bar.scrollLeft = scrollEl.scrollLeft
  }, [overflows, wrapperRef])

  if (!active || !overflows) return null

  return (
    <div
      ref={barRef}
      aria-hidden
      onScroll={(e) => {
        const scrollEl = wrapperRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
        const left = e.currentTarget.scrollLeft
        if (scrollEl && scrollEl.scrollLeft !== left) scrollEl.scrollLeft = left
      }}
      className="w-full overflow-x-auto overflow-y-hidden border-b border-gray-200 bg-gray-50 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-gray-50 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb:hover]:bg-gray-400 [&::-webkit-scrollbar-track]:bg-gray-50"
    >
      <div style={{ width: contentWidth, height: 1 }} />
    </div>
  )
}
