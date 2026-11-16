"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/**
 * The floating panel anchored to the right that every drawer in the app sits
 * in: a capped-height, fully rounded box inset from the viewport edge (not an
 * edge-to-edge sheet), with a colored header band, a scrolling body and an
 * optional sticky footer. Built on the Radix sheet, so Escape, overlay click,
 * focus trapping and scroll locking come for free.
 *
 * Pass `title`/`description` for the standard band, or `header` to supply a
 * fully custom one (render `<DrawerCloseButton>` inside it).
 */
export interface DrawerPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Shown in the default header band; always used as the accessible title. */
  title: ReactNode
  /** Second line of the default header band (supports `\n` line breaks). */
  description?: ReactNode
  /** Replaces the default header band. */
  header?: ReactNode
  /** Sticky row between the header and the scrolling body — e.g. a tab bar. */
  subHeader?: ReactNode
  children: ReactNode
  /** Sticky action row at the bottom, e.g. Cancel / Save. */
  footer?: ReactNode
  /** Classes for the panel itself (e.g. a wider `sm:max-w-[40rem]`). */
  className?: string
  /** Classes for the scrolling body (default `p-6 gap-5`). */
  bodyClassName?: string
  /** Hide the header band entirely (the close button stays). */
  hideHeader?: boolean
}

export function DrawerPanel({
  open,
  onOpenChange,
  title,
  description,
  header,
  subHeader,
  children,
  footer,
  className,
  bodyClassName,
  hideHeader = false,
}: DrawerPanelProps) {
  const a11yTitle = typeof title === "string" ? title : "Details"
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          // Overrides the base side="right" inset-y-0/right-0/h-full/border-l
          // with a centred, capped-height, fully rounded box. `!` forces these
          // past the base classes, whose order isn't guaranteed after a merge.
          "top-1/2! right-4! bottom-auto! h-auto max-h-[98vh] min-h-[98vh] w-[calc(100%-2rem)] -translate-y-1/2 gap-0 overflow-hidden rounded-2xl! border-l-0 p-0 shadow-2xl sm:max-w-[34rem]",
          className,
        )}
      >
        <SheetTitle className="sr-only">{a11yTitle}</SheetTitle>
        <SheetDescription className="sr-only">
          {typeof description === "string" ? description : `Details for ${a11yTitle}`}
        </SheetDescription>

        {header ??
          (hideHeader ? (
            <div className="absolute top-4 right-4 z-10">
              <DrawerCloseButton onClick={() => onOpenChange(false)} tone="muted" />
            </div>
          ) : (
            <DrawerHeader title={title} description={description} onClose={() => onOpenChange(false)} />
          ))}
        {subHeader}

        <div className={cn("flex flex-1 flex-col gap-5 overflow-y-auto p-6", bodyClassName)}>{children}</div>

        {footer && <div className="border-t border-gray-200 bg-white p-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  )
}

/** The default colored header band: title, optional description, white close X. */
export function DrawerHeader({
  title,
  description,
  onClose,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  onClose: () => void
  /** Extra content under the title (pills, a progress bar, …). */
  children?: ReactNode
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 bg-primary p-6 text-primary-foreground">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xl font-semibold">{title}</p>
          {description != null && description !== "" && (
            <p className="mt-1 text-sm whitespace-pre-line opacity-80">{description}</p>
          )}
        </div>
        <DrawerCloseButton onClick={onClose} />
      </div>
      {children}
    </div>
  )
}

/** The "X" used in every drawer header band. */
export function DrawerCloseButton({ onClick, tone = "onBand" }: { onClick: () => void; tone?: "onBand" | "muted" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={cn(
        "shrink-0 cursor-pointer rounded-md p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none",
        tone === "onBand"
          ? "text-primary-foreground/80 hover:text-primary-foreground focus-visible:ring-primary-foreground/50"
          : "text-gray-500 hover:text-gray-900 focus-visible:ring-ring",
      )}
    >
      <X className="size-5" />
    </button>
  )
}

/**
 * A value carries "no data" when it is nullish, a boolean, an empty string or
 * a dash / "N/A" style placeholder. Rows use this to remove themselves rather
 * than render a blank line.
 */
export function isBlankValue(value: ReactNode): boolean {
  if (value == null || typeof value === "boolean") return true
  if (typeof value === "string") {
    const v = value.trim().toLowerCase()
    return ["", "—", "-", "–", "n/a", "not available", "not provided", "unknown"].includes(v)
  }
  return false
}

/** True when at least one value is present — hide a whole section when none is. */
export function anyPresent(...values: ReactNode[]): boolean {
  return values.some((v) => !isBlankValue(v))
}

/** A labelled, bordered block inside the drawer body — "CONTACT", "FINANCIALS", etc. */
export function DrawerSection({
  title,
  tone = "neutral",
  action,
  hidden = false,
  children,
  className,
}: {
  title?: string
  tone?: "neutral" | "success"
  action?: ReactNode
  hidden?: boolean
  children: ReactNode
  className?: string
}) {
  if (hidden) return null
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        tone === "success" ? "border-green-200 bg-green-50/50" : "border-gray-200 bg-gray-50/60",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between">
          {title && <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{title}</p>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

/** Label left, value right, hairline below. Renders nothing when `value` has no data. */
export function LabelValueRow({ label, value, valueClassName }: { label: string; value: ReactNode; valueClassName?: string }) {
  if (isBlankValue(value)) return null
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 py-2.5 text-sm last:border-b-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className={cn("text-right font-semibold text-gray-900", valueClassName)}>{value}</span>
    </div>
  )
}

/** Icon + a caption above a bold value. Renders nothing when `value` has no data. */
export function IconLabelValueRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  if (isBlankValue(value)) return null
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-0.5 text-gray-500">
        {icon}
      </span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

/** Icon + a single line of text. Renders nothing when `value` has no data. */
export function IconValueRow({ icon, value }: { icon: ReactNode; value: ReactNode }) {
  if (isBlankValue(value)) return null
  return (
    <div className="flex items-center gap-3 text-sm text-gray-900">
      <span aria-hidden className="text-gray-500">
        {icon}
      </span>
      {value}
    </div>
  )
}
