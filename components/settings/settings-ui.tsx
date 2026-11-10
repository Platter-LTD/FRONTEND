"use client"

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Laptop,
  Loader2,
  Smartphone,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Shell: page header + section navigation                             */
/* ------------------------------------------------------------------ */

export type SettingsNavItem = {
  id: string
  label: string
  description?: string
  icon: ComponentType<{ className?: string }>
  /** Red styling for destructive sections (e.g. account control). */
  tone?: "danger"
}

/** Reads `?tab=` once on mount and keeps it in sync, so a section can be linked to. */
export function useSettingsTab(items: SettingsNavItem[], fallback: string) {
  const [active, setActive] = useState(fallback)
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("tab")
      if (fromUrl && items.some((i) => i.id === fromUrl)) setActive(fromUrl)
    } catch {
      /* ignore */
    }
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const change = (id: string) => {
    setActive(id)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", id)
      window.history.replaceState(window.history.state, "", url.toString())
    } catch {
      /* ignore */
    }
  }
  return [active, change] as const
}

export function SettingsShell({
  title = "Settings",
  description,
  items,
  active,
  onChange,
  children,
}: {
  title?: string
  description?: string
  items: SettingsNavItem[]
  active: string
  onChange: (id: string) => void
  children: ReactNode
}) {
  const pillsRef = useRef<HTMLElement>(null)
  // Keep the selected pill visible in the horizontal strip on small screens.
  useEffect(() => {
    pillsRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [active])
  return (
    <div className="min-h-full w-full bg-gray-50/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
          {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
          {/* Mobile / tablet: horizontal scrolling pills */}
          <nav
            ref={pillsRef}
            aria-label="Settings sections"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden"
          >
            {items.map((item) => {
              const Icon = item.icon
              const isActive = item.id === active
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? item.tone === "danger"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-brand/30 bg-brand/10 text-brand"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Desktop: vertical section list */}
          <nav aria-label="Settings sections" className="hidden lg:block">
            <ul className="sticky top-6 space-y-1">
              {items.map((item) => {
                const Icon = item.icon
                const isActive = item.id === active
                const danger = item.tone === "danger"
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onChange(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none",
                        isActive ? "bg-white shadow-sm ring-1 ring-gray-200" : "hover:bg-white/70",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
                          isActive
                            ? danger
                              ? "bg-red-50 text-red-600"
                              : "bg-brand/10 text-brand"
                            : danger
                              ? "text-red-500"
                              : "text-gray-500 group-hover:text-gray-700",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block text-sm font-medium",
                            isActive ? (danger ? "text-red-700" : "text-gray-900") : danger ? "text-red-600" : "text-gray-700",
                          )}
                        >
                          {item.label}
                        </span>
                        {item.description ? (
                          <span className="mt-0.5 block text-xs leading-snug text-gray-500">{item.description}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="min-w-0 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Cards, fields, controls                                             */
/* ------------------------------------------------------------------ */

export function SettingsCard({
  icon: Icon,
  title,
  description,
  action,
  footer,
  tone,
  children,
  bodyClassName,
}: {
  icon?: ComponentType<{ className?: string }>
  title: ReactNode
  description?: ReactNode
  /** Right side of the header (e.g. an "Add" button). */
  action?: ReactNode
  /** Right-aligned action strip at the bottom. */
  footer?: ReactNode
  tone?: "danger"
  children?: ReactNode
  bodyClassName?: string
}) {
  const danger = tone === "danger"
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-xs",
        danger ? "border-red-200" : "border-gray-200",
      )}
    >
      <header className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                danger ? "bg-red-50 text-red-600" : "bg-brand/10 text-brand",
              )}
            >
              <Icon className="size-[18px]" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className={cn("text-base font-semibold", danger ? "text-red-700" : "text-gray-900")}>{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-gray-500">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
      </header>
      {children != null ? <div className={cn("px-5 py-5 sm:px-6", bodyClassName)}>{children}</div> : null}
      {footer ? (
        <footer className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}

export const settingsInputClass =
  "h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-gray-400 hover:border-gray-400 focus:border-brand focus:ring-[3px] focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 read-only:bg-gray-50 read-only:text-gray-600 read-only:hover:border-gray-300 read-only:focus:ring-0 read-only:focus:border-gray-300"

export const settingsPrimaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"

export const settingsSecondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"

export const settingsDangerButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"

/** A primary button that shows a spinner + `busyLabel` while `busy`. */
export function SettingsSubmit({
  busy,
  busyLabel = "Saving…",
  disabled,
  onClick,
  children,
  variant = "primary",
  className,
}: {
  busy?: boolean
  busyLabel?: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  variant?: "primary" | "secondary" | "danger"
  className?: string
}) {
  const base =
    variant === "danger"
      ? settingsDangerButtonClass
      : variant === "secondary"
        ? settingsSecondaryButtonClass
        : settingsPrimaryButtonClass
  return (
    <button type="button" onClick={onClick} disabled={busy || disabled} className={cn(base, className)}>
      {busy ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function SettingsField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  )
}

/** Password input with a show / hide toggle. */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(settingsInputClass, "pr-11")}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-700"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "A symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

/** Strength bar + rule checklist for a new password (guidance only). */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length
  const levels = [
    { label: "Weak", bar: "bg-red-500", text: "text-red-600" },
    { label: "Weak", bar: "bg-red-500", text: "text-red-600" },
    { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
    { label: "Good", bar: "bg-lime-500", text: "text-lime-700" },
    { label: "Strong", bar: "bg-green-600", text: "text-green-700" },
  ]
  const level = levels[passed]
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < passed ? level.bar : "bg-gray-200")} />
          ))}
        </div>
        <span className={cn("text-xs font-medium", level.text)}>{level.label}</span>
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password)
          return (
            <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-green-700" : "text-gray-500")}>
              {ok ? <Check className="size-3.5" /> : <X className="size-3.5 text-gray-400" />}
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Inline result message inside a card. */
export function SettingsNotice({ tone, children }: { tone: "success" | "error" | "info"; children: ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        tone === "success" && "border-green-200 bg-green-50 text-green-800",
        tone === "error" && "border-red-200 bg-red-50 text-red-800",
        tone === "info" && "border-gray-200 bg-gray-50 text-gray-700",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function SettingsEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-gray-900">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Profile summary + sessions                                          */
/* ------------------------------------------------------------------ */

export function ProfileSummary({ name, email, loading }: { name: string; email: string; loading?: boolean }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || (email.charAt(0) || "U").toUpperCase()
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-xs sm:px-6">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-base font-semibold text-brand-foreground">
        {loading ? "" : initials}
      </span>
      <div className="min-w-0">
        {loading ? (
          <div className="space-y-2">
            <span className="block h-4 w-40 animate-pulse rounded bg-gray-200" />
            <span className="block h-3 w-56 animate-pulse rounded bg-gray-100" />
          </div>
        ) : (
          <>
            <p className="truncate text-base font-semibold text-gray-900">{name || "Your account"}</p>
            <p className="truncate text-sm text-gray-500">{email}</p>
          </>
        )}
      </div>
    </div>
  )
}

export function SessionItem({
  device,
  ip,
  lastActive,
  created,
  sessionId,
  isCurrent,
  onRevoke,
  revoking,
}: {
  device: string
  ip?: string
  lastActive?: string
  created?: string
  sessionId?: string
  isCurrent?: boolean
  onRevoke?: () => void
  revoking?: boolean
}) {
  const mobile = /iphone|android|mobile|ipad/i.test(device)
  const Icon = mobile ? Smartphone : Laptop
  const meta = [ip, lastActive ? `Last active ${lastActive}` : null, created ? `Signed in ${created}` : null].filter(Boolean)
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            isCurrent ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
            <span className="truncate">{device}</span>
            {isCurrent ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                <span className="size-1.5 rounded-full bg-green-500" />
                This device
              </span>
            ) : null}
          </p>
          {meta.length ? <p className="mt-0.5 text-xs text-gray-500">{meta.join(" · ")}</p> : null}
          {sessionId ? <p className="mt-0.5 truncate font-mono text-[11px] text-gray-400">{sessionId}</p> : null}
        </div>
      </div>
      {!isCurrent && onRevoke ? (
        <button
          type="button"
          onClick={onRevoke}
          disabled={revoking}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 sm:self-center"
        >
          {revoking ? <Loader2 className="size-4 animate-spin" /> : null}
          Sign out
        </button>
      ) : null}
    </li>
  )
}

export function SessionsSkeleton() {
  return (
    <ul className="divide-y divide-gray-100">
      {[0, 1].map((i) => (
        <li key={i} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
          <span className="size-10 animate-pulse rounded-lg bg-gray-100" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-40 animate-pulse rounded bg-gray-200" />
            <span className="block h-3 w-64 animate-pulse rounded bg-gray-100" />
          </span>
        </li>
      ))}
    </ul>
  )
}
