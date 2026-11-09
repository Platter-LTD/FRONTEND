"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { flexRender, type Row } from "@tanstack/react-table"
import { Check, Copy, ExternalLink, X as XIcon } from "lucide-react"
import { DrawerPanel, DrawerSection } from "@/components/ui/drawer-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { ACTIONS_COLUMN_ID } from "@/lib/table-column-prefs"
import { cn } from "@/lib/utils"

/**
 * Lets a row's kebab menu open that row's details. `DataTable` provides it, so
 * every table gets a "View details" action without each page wiring one.
 */
export const RowDetailsContext = createContext<((row: unknown) => void) | null>(null)

export function useRowDetails() {
  return useContext(RowDetailsContext)
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

const HIDDEN_KEYS = new Set(["__v", "password", "passwordHash", "salt", "hash", "refreshToken", "accessToken"])
const ACRONYMS: Record<string, string> = {
  id: "ID",
  url: "URL",
  uri: "URI",
  api: "API",
  bvn: "BVN",
  nin: "NIN",
  kyc: "KYC",
  npl: "NPL",
  npa: "NPA",
  otp: "OTP",
  ip: "IP",
  sku: "SKU",
  ref: "Ref",
}

/** `createdAt` / `created_at` / `CREATED-AT` → "Created at". */
export function humanizeKey(key: string): string {
  const words = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .map((w) => w.toLowerCase())
  return words
    .map((w, i) => ACRONYMS[w] ?? (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ")
}

type Plain = Record<string, unknown>
const isPlainObject = (v: unknown): v is Plain => {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return false
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

function isEmpty(v: unknown): boolean {
  if (v == null || typeof v === "function" || typeof v === "symbol") return true
  // React elements and class instances (Dates aside) aren't backend data.
  if (typeof v === "object" && !Array.isArray(v) && ("$$typeof" in v || (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null))) {
    return !(v instanceof Date)
  }
  if (typeof v === "string") return v.trim() === ""
  if (Array.isArray(v)) return v.length === 0 || v.every(isEmpty)
  if (isPlainObject(v)) return Object.entries(v).every(([k, x]) => HIDDEN_KEYS.has(k) || isEmpty(x))
  return false
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
const IMAGE_URL = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const hasTime = value.length > 10
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label="Copy value"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        })
      }}
      className="ml-1.5 inline-flex shrink-0 rounded p-0.5 align-middle text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
    >
      {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
    </button>
  )
}

/** One primitive value, formatted for reading. */
function PrimitiveValue({ name, value }: { name: string; value: unknown }) {
  if (typeof value === "boolean") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          value ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600",
        )}
      >
        {value ? <Check className="size-3" /> : <XIcon className="size-3" />}
        {value ? "Yes" : "No"}
      </span>
    )
  }
  if (value instanceof Date) return <span>{formatDate(value.toISOString())}</span>
  if (typeof value === "number") return <span className="tabular-nums">{value.toLocaleString("en-US")}</span>
  const text = String(value)
  if (/^https?:\/\//i.test(text)) {
    if (IMAGE_URL.test(text)) {
      return (
        <a href={text} target="_blank" rel="noreferrer" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={text} alt={humanizeKey(name)} className="h-16 w-16 rounded-md border border-gray-200 object-cover" />
        </a>
      )
    }
    return (
      <a
        href={text}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-center gap-1 break-all text-primary hover:underline"
      >
        {text}
        <ExternalLink className="size-3 shrink-0" />
      </a>
    )
  }
  if (ISO_DATE.test(text)) return <span>{formatDate(text)}</span>
  if (text.includes("->")) return <span className="break-words">{text.replace(/\s*->\s*/g, " → ")}</span>
  const isIdLike = /(^|[a-z])(id|Id|ID|ref|Ref|reference|Reference|number|Number|code|Code)$/.test(name) && text.length >= 6
  return (
    <span className="break-words whitespace-pre-line">
      {text}
      {isIdLike ? <CopyButton text={text} /> : null}
    </span>
  )
}

function itemTitle(item: Plain, index: number): { title: string; key?: string } {
  for (const k of ["name", "title", "label", "type", "key", "fileName"]) {
    const v = item[k]
    if (typeof v === "string" && v.trim()) return { title: v, key: k }
  }
  return { title: `Item ${index + 1}` }
}

/** Label / value rows for an object; nested objects and arrays recurse. */
function FieldList({ data, depth, omit }: { data: Plain; depth: number; omit?: string }) {
  const entries = Object.entries(data).filter(([k, v]) => k !== omit && !HIDDEN_KEYS.has(k) && !isEmpty(v))
  if (entries.length === 0) return <p className="text-sm text-gray-400">No data</p>
  return (
    <dl className="divide-y divide-gray-100">
      {entries.map(([key, value]) => (
        <FieldRow key={key} name={key} value={value} depth={depth} />
      ))}
    </dl>
  )
}

function FieldRow({ name, value, depth }: { name: string; value: unknown; depth: number }) {
  const label = humanizeKey(name)
  const isNested = isPlainObject(value) || (Array.isArray(value) && value.some((v) => v != null && typeof v === "object"))

  if (isNested) {
    return (
      <div className="py-2.5">
        <dt className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</dt>
        <dd>
          <NestedValue value={value} depth={depth + 1} />
        </dd>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-6 py-2.5 text-sm">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-gray-900">
        {Array.isArray(value) ? (
          <span className="flex flex-wrap justify-end gap-1.5">
            {value
              .filter((v) => !isEmpty(v))
              .map((v, i) => (
                <span key={i} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {typeof v === "string" && ISO_DATE.test(v) ? formatDate(v) : String(v)}
                </span>
              ))}
          </span>
        ) : (
          <PrimitiveValue name={name} value={value} />
        )}
      </dd>
    </div>
  )
}

function NestedValue({ value, depth }: { value: unknown; depth: number }) {
  if (depth > 6) {
    return <pre className="overflow-x-auto rounded-md bg-gray-50 p-2 text-xs text-gray-700">{JSON.stringify(value, null, 2)}</pre>
  }
  if (Array.isArray(value)) {
    const items = value.filter((v) => !isEmpty(v))
    return (
      <div className="space-y-2">
        {items.map((item, i) => {
          if (!isPlainObject(item)) return (
            <span key={i} className="mr-1.5 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {String(item)}
            </span>
          )
          const { title, key } = itemTitle(item, i)
          const rest = Object.keys(item).some((k) => k !== key && !HIDDEN_KEYS.has(k) && !isEmpty(item[k]))
          return (
            <div key={i} className="rounded-lg border border-gray-200 bg-white px-3 py-1">
              <p className={cn("py-2 text-sm font-semibold text-gray-900", rest && "border-b border-gray-100")}>{title}</p>
              {rest ? <FieldList data={item} depth={depth} omit={key} /> : null}
            </div>
          )
        })}
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3">
      <FieldList data={value as Plain} depth={depth} />
    </div>
  )
}

/** If an API envelope (`{ success, data }`) came back, show its payload. */
export function unwrapRecord(value: unknown): unknown {
  let current = value
  for (let i = 0; i < 3; i++) {
    if (!isPlainObject(current)) break
    const keys = Object.keys(current)
    const inner = current.data ?? current.product ?? current.result
    const looksLikeEnvelope =
      inner != null && keys.every((k) => ["success", "status", "message", "data", "product", "result", "statusCode", "error"].includes(k))
    if (!looksLikeEnvelope) break
    current = inner
  }
  return current
}

/** Every field of a backend record: flat fields first, then a section per nested group. */
export function RecordDetails({ record }: { record: unknown }) {
  const data = unwrapRecord(record)
  if (!isPlainObject(data)) {
    return (
      <DrawerSection title="Details">
        <PrimitiveValue name="value" value={data} />
      </DrawerSection>
    )
  }
  const entries = Object.entries(data).filter(([k, v]) => !HIDDEN_KEYS.has(k) && !isEmpty(v))
  const flat = entries.filter(([, v]) => !isPlainObject(v) && !(Array.isArray(v) && v.some((x) => x != null && typeof x === "object")))
  const nested = entries.filter((e) => !flat.includes(e))
  return (
    <>
      {flat.length > 0 && (
        <DrawerSection title="Overview">
          <dl className="-my-2.5 divide-y divide-gray-200">
            {flat.map(([key, value]) => (
              <FieldRow key={key} name={key} value={value} depth={0} />
            ))}
          </dl>
        </DrawerSection>
      )}
      {nested.map(([key, value]) => (
        <DrawerSection
          key={key}
          title={humanizeKey(key)}
          action={
            Array.isArray(value) ? (
              <span className="rounded-full bg-gray-200/70 px-2 py-0.5 text-xs font-medium text-gray-600">
                {value.filter((v) => !isEmpty(v)).length}
              </span>
            ) : undefined
          }
        >
          {Array.isArray(value) ? <NestedValue value={value} depth={1} /> : <FieldList data={value as Plain} depth={1} />}
        </DrawerSection>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Drawer                                                              */
/* ------------------------------------------------------------------ */

/**
 * Details drawer for a table row. With a `record` (the full backend object, or
 * one fetched via `load`) it shows every field the backend returned, grouped
 * and formatted. Without one it falls back to the table's columns.
 */
export function RowDetailsDrawer<TData>({
  row,
  labelOf,
  title,
  onClose,
  record,
  load,
}: {
  row: Row<TData> | null
  labelOf: (columnId: string) => string
  title: ReactNode
  onClose: () => void
  /** The full object to describe (defaults to the row's data). */
  record?: (row: TData) => unknown
  /** Fetch the complete record from the backend when the drawer opens. */
  load?: (row: TData) => Promise<unknown>
}) {
  const original = row?.original
  const [loaded, setLoaded] = useState<{ key: unknown; value: unknown } | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Pages pass `load` inline; keep the latest without refetching on every render.
  const loadRef = useRef(load)
  loadRef.current = load
  const hasLoad = load != null

  useEffect(() => {
    const fn = loadRef.current
    if (original == null || !fn) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    fn(original)
      .then((value) => {
        if (!cancelled) setLoaded({ key: original, value })
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load the full record.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [original, hasLoad])

  const base = original != null ? (record ? record(original) : original) : null
  const fetched = loaded && loaded.key === original ? unwrapRecord(loaded.value) : null
  // Merge so fields only the list endpoint returned still show.
  const full =
    isPlainObject(fetched) && isPlainObject(base) ? { ...base, ...fetched } : (fetched ?? base)
  const showRecord = isPlainObject(unwrapRecord(full))

  const cells = row ? row.getAllCells().filter((c) => c.column.id !== ACTIONS_COLUMN_ID) : []
  return (
    <DrawerPanel
      open={row != null}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={title}
      description="Record details"
      className="sm:max-w-[40rem]"
    >
      {showRecord ? (
        <>
          {loadError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Showing the summary only — {loadError}
            </p>
          ) : null}
          {loading && !fetched ? (
            <div className="space-y-3 rounded-xl border border-gray-200 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-6">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          ) : null}
          <RecordDetails record={full} />
        </>
      ) : (
        <DrawerSection>
          {cells.map((cell) => (
            <div
              key={cell.id}
              className="flex items-start justify-between gap-6 border-b border-gray-200 py-2.5 text-sm last:border-b-0 last:pb-0"
            >
              <span className="shrink-0 text-gray-500">{labelOf(cell.column.id)}</span>
              <span className="min-w-0 text-right font-medium break-words text-gray-900">
                {flexRender(cell.column.columnDef.cell, cell.getContext()) ?? "—"}
              </span>
            </div>
          ))}
        </DrawerSection>
      )}
    </DrawerPanel>
  )
}
