"use client"

import { createContext, useContext, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AlertCircle, Check, FileText, Loader2, Lock, RefreshCw, ShieldCheck, UploadCloud, X } from "lucide-react"
import { cn } from "@/lib/utils"

/* ────────────────────────────────────────────────────────────────────────────
 * Building blocks for the merchant compliance (KYB) flow. Colours come from the
 * app's `brand` token (splata gold / spring purple), so both apps share the
 * layout while keeping their own accent.
 * ──────────────────────────────────────────────────────────────────────────── */

export type ComplianceStep = {
  id: string
  label: string
  description: string
  locked?: boolean
  completed?: boolean
}

/** Page header: title, one-line explanation and the overall review status. */
export function ComplianceHeader({
  approved,
  completedCount,
  totalCount,
}: {
  approved: boolean
  completedCount: number
  totalCount: number
}) {
  const pct = approved ? 100 : Math.round((completedCount / Math.max(totalCount, 1)) * 100)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-brand/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-brand/5 blur-2xl" />
      <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">Business compliance</h1>
              {approved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
                  <Check className="size-3" /> Approved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
                  In progress
                </span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-500">
              Verify your business to unlock payouts, products and live API keys. Your progress is kept as you move
              between steps.
            </p>
          </div>
        </div>
        <div className="w-full shrink-0 lg:w-64">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-gray-500">Overall progress</span>
            <span className="font-semibold text-gray-900 tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {approved ? "All steps verified" : `${completedCount} of ${totalCount} steps completed`}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Numbered step navigation with connectors; locked steps can't be opened yet. */
export function ComplianceStepper({
  steps,
  activeId,
  onChange,
}: {
  steps: ComplianceStep[]
  activeId: string
  onChange: (id: string) => void
}) {
  return (
    <nav aria-label="Compliance steps" className="rounded-2xl border border-gray-200 bg-white p-2">
      <ol className="grid gap-1 sm:grid-cols-3">
        {steps.map((step, i) => {
          const active = step.id === activeId
          const done = step.completed && !active
          return (
            <li key={step.id} className="relative">
              <button
                type="button"
                disabled={step.locked}
                onClick={() => !step.locked && onChange(step.id)}
                aria-current={active ? "step" : undefined}
                title={step.locked ? "Complete the previous step first" : undefined}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors",
                  active && "bg-brand/[0.07] ring-1 ring-brand/25",
                  !active && !step.locked && "hover:bg-gray-50",
                  step.locked && "cursor-not-allowed opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    done && "bg-green-500 text-white",
                    active && "bg-brand text-brand-foreground shadow-sm",
                    !done && !active && !step.locked && "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
                    step.locked && "bg-gray-50 text-gray-400 ring-1 ring-gray-200"
                  )}
                >
                  {done ? <Check className="size-4" /> : step.locked ? <Lock className="size-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-semibold", active ? "text-gray-900" : "text-gray-700")}>
                    {step.label}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {done ? "Completed" : step.locked ? "Locked" : step.description}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** White card with an icon badge, title and description. */
export function SectionCard({
  icon,
  title,
  description,
  children,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-gray-200 bg-white shadow-xs", className)}>
      <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand [&_svg]:size-[18px]">
              {icon}
            </span>
          )}
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

/** Label + control + optional hint, consistently spaced. */
export function Field({
  label,
  hint,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string
  hint?: string
  required?: boolean
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

/** Shared look for text inputs and select triggers in the flow. */
export const fieldControlClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3.5 text-sm text-gray-900 shadow-xs transition-[color,box-shadow] outline-none placeholder:text-gray-400 hover:border-gray-400 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"

/** Where step action bars render: a strip pinned under the page's scroll area. */
const FooterSlotContext = createContext<HTMLElement | null>(null)

/**
 * Page frame for the flow: the header, steps and form scroll inside the page,
 * while the bottom strip (filled by each step's `StepFooter`) stays pinned to
 * the bottom of the screen. Fills the dashboard's content area.
 */
export function ComplianceLayout({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  return (
    <FooterSlotContext.Provider value={slot}>
      <div className="flex h-full min-h-0 flex-col bg-gray-50/60">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </div>
        <div ref={setSlot} className="shrink-0 empty:hidden" />
      </div>
    </FooterSlotContext.Provider>
  )
}

/** Bottom action bar of a step: helper text on the left, primary action on the right. Pinned to the bottom of the page. */
export function StepFooter({
  hint,
  children,
}: {
  hint?: ReactNode
  children: ReactNode
}) {
  const slot = useContext(FooterSlotContext)
  const bar = (
    <div className="border-t border-gray-200 bg-white/95 shadow-[0_-4px_16px_-8px_rgba(16,24,40,0.12)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col-reverse items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">{hint}</p>
        <div className="flex gap-3 sm:justify-end">{children}</div>
      </div>
    </div>
  )
  // Outside a ComplianceLayout (or before its slot mounts) render in place.
  return slot ? createPortal(bar, slot) : <div className="mt-6">{bar}</div>
}

/** Primary brand-coloured button used by the flow. */
export function BrandButton({
  children,
  loading,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-sm transition-[filter,opacity] hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-brand/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

/**
 * One document slot: drop zone or click to choose, validation message,
 * selected file chip with replace/remove. Validation is supplied by the caller.
 */
export function DocumentDropTile({
  id,
  title,
  hint,
  accept,
  required,
  file,
  invalid,
  validate,
  onFile,
}: {
  id: string
  title: string
  hint: string
  accept: string
  required?: boolean
  /** The currently selected file (controlled). */
  file: File | null
  /** Highlight as missing (e.g. after a failed submit). */
  invalid?: boolean
  /** Return an error message to reject the file. */
  validate?: (file: File) => string | null
  onFile: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejectedName, setRejectedName] = useState<string | null>(null)

  const take = (picked: File | null) => {
    if (!picked) return
    const msg = validate?.(picked) ?? null
    if (msg) {
      setError(msg)
      setRejectedName(picked.name)
      onFile(null)
      return
    }
    setError(null)
    setRejectedName(null)
    onFile(picked)
  }

  const bad = !!error || (invalid && !file)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        take(e.dataTransfer.files?.[0] ?? null)
      }}
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border p-4 transition-colors",
        file && !bad && "border-green-200 bg-green-50/40",
        bad && "border-red-300 bg-red-50/60",
        !file && !bad && "border-dashed border-gray-300 bg-white hover:border-brand/50 hover:bg-brand/[0.03]",
        dragging && "border-brand bg-brand/[0.05]"
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg",
          file && !bad ? "bg-green-100 text-green-700" : bad ? "bg-red-100 text-red-600" : "bg-brand/10 text-brand"
        )}
      >
        {file && !bad ? <FileText className="size-5" /> : bad ? <AlertCircle className="size-5" /> : <UploadCloud className="size-5" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              required ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-700"
            )}
          >
            {required ? "Required" : "Optional"}
          </span>
        </div>
        {file && !bad ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-green-700">
            <Check className="size-3.5 shrink-0" />
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-green-600/70">· {(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </p>
        ) : error ? (
          <p className="mt-0.5 text-xs text-red-600">
            {rejectedName && <span className="font-medium">{rejectedName}: </span>}
            {error}
          </p>
        ) : invalid ? (
          <p className="mt-0.5 text-xs text-red-600">This document is required.</p>
        ) : (
          <p className="mt-0.5 text-xs text-gray-500">
            <span className="hidden sm:inline">Drag &amp; drop or click to upload · </span>
            {hint}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {file && (
          <button
            type="button"
            onClick={() => {
              setError(null)
              onFile(null)
            }}
            aria-label={`Remove ${title}`}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors",
            file
              ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : "bg-brand text-brand-foreground shadow-sm hover:brightness-95"
          )}
        >
          {file ? <RefreshCw className="size-3.5" /> : <UploadCloud className="size-4" />}
          {file ? "Replace" : "Upload"}
        </button>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null
          e.target.value = ""
          take(picked)
        }}
      />
    </div>
  )
}
