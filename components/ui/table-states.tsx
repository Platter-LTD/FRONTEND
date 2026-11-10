"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TableEmptyStateProps {
  title?: string
  description?: string
  className?: string
}

/**
 * Illustrated "no rows" state. Drawn in `currentColor` tints of the app's
 * primary token so it picks up each app's own palette.
 */
export function TableEmptyState({
  title = "No records found",
  description = "There are no records to display at the moment.",
  className,
}: TableEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-8 py-14", className)}>
      <div className="mb-6 text-primary select-none" aria-hidden="true">
        <svg width="190" height="150" viewBox="0 0 190 150" fill="none">
          <ellipse cx="95" cy="145" rx="75" ry="5" fill="currentColor" opacity="0.06" />
          <defs>
            <clipPath id="table-empty-doc">
              <rect x="15" y="10" width="102" height="115" rx="10" />
            </clipPath>
          </defs>
          <g clipPath="url(#table-empty-doc)">
            <rect x="15" y="10" width="102" height="115" fill="white" />
            <rect x="15" y="10" width="102" height="30" fill="currentColor" />
            <rect x="27" y="20" width="44" height="5" rx="2.5" fill="white" opacity="0.6" />
            <rect x="97" y="19" width="12" height="7" rx="3.5" fill="white" opacity="0.3" />
          </g>
          <rect x="15" y="10" width="102" height="115" rx="10" stroke="#E5E7EB" strokeWidth="1.5" fill="none" />
          <circle cx="35" cy="57" r="8" fill="#F3F4F6" />
          <rect x="49" y="52" width="42" height="5" rx="2.5" fill="#E5E7EB" />
          <rect x="49" y="60" width="28" height="4" rx="2" fill="#F3F4F6" />
          <line x1="15" y1="72" x2="117" y2="72" stroke="#F3F4F6" strokeWidth="1" />
          <circle cx="35" cy="83" r="8" fill="#F3F4F6" />
          <rect x="49" y="78" width="35" height="5" rx="2.5" fill="#E5E7EB" />
          <rect x="49" y="86" width="22" height="4" rx="2" fill="#F3F4F6" />
          <line x1="15" y1="98" x2="117" y2="98" stroke="#F3F4F6" strokeWidth="1" />
          <circle cx="35" cy="109" r="8" fill="#F9FAFB" />
          <rect x="49" y="104" width="28" height="5" rx="2.5" fill="#F3F4F6" />
          <rect x="49" y="112" width="18" height="4" rx="2" fill="#F9FAFB" />
          <circle cx="140" cy="78" r="36" fill="currentColor" opacity="0.06" />
          <circle cx="140" cy="75" r="28" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
          <circle cx="140" cy="75" r="24" fill="currentColor" opacity="0.04" />
          <line x1="161" y1="96" x2="175" y2="113" stroke="#D1D5DB" strokeWidth="5" strokeLinecap="round" />
          <rect x="128" y="66" width="24" height="3.5" rx="1.75" fill="#D1D5DB" />
          <rect x="128" y="73" width="18" height="3.5" rx="1.75" fill="#E5E7EB" />
          <rect x="128" y="80" width="20" height="3.5" rx="1.75" fill="#E5E7EB" />
          <circle cx="4" cy="28" r="4" fill="currentColor" opacity="0.2" />
          <circle cx="184" cy="14" r="5" fill="white" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
          <circle cx="2" cy="92" r="2.5" fill="currentColor" opacity="0.25" />
          <circle cx="184" cy="125" r="3" fill="currentColor" opacity="0.2" />
          <circle cx="98" cy="142" r="2" fill="currentColor" opacity="0.2" />
          <circle cx="170" cy="42" r="3" fill="currentColor" opacity="0.2" />
          <circle cx="5" cy="135" r="1.5" fill="currentColor" opacity="0.2" />
        </svg>
      </div>

      <div className="max-w-65 space-y-1.5 text-center">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {description ? <p className="text-sm leading-relaxed text-gray-500">{description}</p> : null}
      </div>
    </div>
  )
}

interface TableErrorStateProps {
  /** What went wrong, in the API's own words when it gave any. */
  message?: string
  /** Wire to the query's refetch. */
  onRetry?: () => void
  className?: string
}

/** The counterpart to `TableEmptyState`, for when the list could not be loaded at all. */
export function TableErrorState({ message, onRetry, className }: TableErrorStateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-5 px-8 py-14", className)}>
      <span className="flex size-12 items-center justify-center rounded-full border-8 border-amber-50 bg-amber-100 text-amber-600">
        <AlertCircle className="size-5" />
      </span>
      <div className="max-w-80 space-y-1.5 text-center">
        <p className="text-sm font-semibold text-gray-900">Couldn&apos;t load this list</p>
        <p className="text-sm leading-relaxed text-gray-500">
          {message || "Something went wrong on our end. Try again in a moment."}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/** Best-effort human message from an unknown thrown value / API error. */
export function errorMessageOf(error: unknown): string | undefined {
  if (!error) return undefined
  if (typeof error === "string") return error
  const e = error as { response?: { data?: { message?: unknown } }; message?: unknown }
  const apiMessage = e.response?.data?.message
  if (typeof apiMessage === "string" && apiMessage) return apiMessage
  if (typeof e.message === "string" && e.message) return e.message
  return undefined
}
