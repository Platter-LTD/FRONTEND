"use client"

import { useMemo, useRef, useState } from "react"
import { Download, FileSpreadsheet, FileText, FileType2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { errorMessageOf } from "@/components/ui/table-states"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type DownloadFormat = "xlsx" | "csv" | "pdf"

export type DownloadColumn<T> = {
  /** Stable identifier for the column. */
  key: string
  /** Header label shown in the modal and written into the file. */
  label: string
  /** How to extract the export value from a row. Defaults to `row[key]`. */
  accessor?: (row: T) => string | number | null | undefined
  /** Selected by default when the modal opens. Defaults to `true`. */
  defaultSelected?: boolean
  /** Sum this column into a trailing totals row. */
  total?: boolean
}

export type DownloadPageResult<T> = { items: T[]; totalCount: number }

export type DownloadFetchPage<T> = (
  pageNo: number,
  pageSize: number,
  signal?: AbortSignal
) => Promise<DownloadPageResult<T>>

export type TableDownloadConfig<T> = {
  /** Filename prefix (no extension). A timestamp is appended. */
  filename: string
  /** Document title used in the PDF and as the XLSX sheet name. */
  title?: string
  /** Columns available for export. */
  columns: DownloadColumn<T>[]
  /** Wraps the list endpoint. */
  fetchPage: DownloadFetchPage<T>
  /** Current page number (1-indexed) shown in the table. */
  currentPageNo: number
  /** Page size used for fetches. Defaults to 100. */
  pageSize?: number
}

/**
 * What a page passes to `DataTable`'s `download` prop. Everything is optional:
 * `DataTable` fills in the columns from the table's own column set, and for
 * client-side tables pages through the rows it already holds. Server-paginated
 * tables should pass `fetchPage` so "All pages" can fetch beyond the current page.
 */
export type TableDownloadOptions<T> = Partial<TableDownloadConfig<T>>

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "1, 3, 5-7" → [1, 3, 5, 6, 7], or an error string. */
export function parsePageRange(
  input: string,
  maxPage: number
): { pages: number[]; error?: undefined } | { pages?: undefined; error: string } {
  const trimmed = input.trim()
  if (!trimmed) return { error: "Enter at least one page" }
  const segments = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length === 0) return { error: "Enter at least one page" }
  const set = new Set<number>()
  for (const seg of segments) {
    if (seg.includes("-")) {
      const [aRaw, bRaw, ...rest] = seg.split("-")
      if (rest.length > 0) return { error: `Invalid range '${seg}'` }
      const a = Number(aRaw)
      const b = Number(bRaw)
      if (!Number.isInteger(a) || !Number.isInteger(b)) return { error: `Invalid range '${seg}'` }
      if (a < 1 || b < 1) return { error: "Page numbers must be 1 or greater" }
      if (a > b) return { error: `Invalid range '${seg}'` }
      if (b > maxPage) return { error: `Page ${b} exceeds the last page (${maxPage})` }
      for (let p = a; p <= b; p++) set.add(p)
    } else {
      const n = Number(seg)
      if (!Number.isInteger(n)) return { error: `Invalid page '${seg}'` }
      if (n < 1) return { error: "Page numbers must be 1 or greater" }
      if (n > maxPage) return { error: `Page ${n} exceeds the last page (${maxPage})` }
      set.add(n)
    }
  }
  return { pages: Array.from(set).sort((a, b) => a - b) }
}

/** Fetch pages with bounded concurrency; results come back in page order. */
async function fetchPagesConcurrent<T>(
  fetchPage: DownloadFetchPage<T>,
  pages: number[],
  pageSize: number,
  options?: { concurrency?: number; signal?: AbortSignal; onProgress?: (done: number, total: number) => void }
): Promise<T[]> {
  const concurrency = Math.max(1, options?.concurrency ?? 4)
  const results: T[][] = new Array(pages.length)
  let completed = 0
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < pages.length) {
      if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError")
      const idx = cursor++
      const res = await fetchPage(pages[idx], pageSize, options?.signal)
      results[idx] = res.items
      completed++
      options?.onProgress?.(completed, pages.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pages.length) }, () => worker()))
  return results.flat()
}

function getCellValue<T>(row: T, col: DownloadColumn<T>): string | number {
  const raw = col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key]
  if (raw == null) return ""
  if (typeof raw === "number") return raw
  if (typeof raw === "boolean") return raw ? "Yes" : "No"
  if (typeof raw === "object") return JSON.stringify(raw)
  return String(raw)
}

function buildMatrix<T>(rows: T[], columns: DownloadColumn<T>[]): (string | number)[][] {
  const header = columns.map((c) => c.label)
  const body = rows.map((row) => columns.map((col) => getCellValue(row, col)))
  if (!columns.some((c) => c.total)) return [header, ...body]
  const totals: (string | number)[] = columns.map((col) => {
    if (!col.total) return ""
    const sum = rows.reduce((acc, item) => {
      const v = getCellValue(item, col)
      return typeof v === "number" ? acc + v : acc
    }, 0)
    return Math.round(sum * 100) / 100
  })
  if (!columns[0]?.total) totals[0] = "Total"
  return [header, ...body, totals]
}

function fullFilename(filename: string, ext: DownloadFormat): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `${filename}-${stamp}.${ext}`
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function escapeCsvCell(value: string | number): string {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Primary token → RGB, for the PDF header fill (falls back to near-black). */
function primaryRgb(): [number, number, number] {
  try {
    const probe = document.createElement("span")
    probe.style.color = "var(--primary)"
    probe.style.display = "none"
    document.body.appendChild(probe)
    const color = getComputedStyle(probe).color
    probe.remove()
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext("2d")
    if (!ctx) return [23, 23, 23]
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return [r, g, b]
  } catch {
    return [23, 23, 23]
  }
}

type ExportArgs<T> = { rows: T[]; columns: DownloadColumn<T>[]; filename: string; title?: string }

async function exportRows<T>(format: DownloadFormat, { rows, columns, filename, title }: ExportArgs<T>) {
  const matrix = buildMatrix(rows, columns)

  if (format === "csv") {
    const csv = matrix.map((line) => line.map(escapeCsvCell).join(",")).join("\r\n")
    downloadBlob(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), fullFilename(filename, "csv"))
    return
  }

  if (format === "xlsx") {
    const writeXlsxFile = (await import("write-excel-file/browser")).default
    const widths = matrix[0].map((_, i) => ({
      width: Math.min(60, Math.max(8, ...matrix.map((r) => String(r[i] ?? "").length + 2))),
    }))
    const sheet = (title ?? "Sheet1").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet1"
    const blob = await writeXlsxFile(matrix, { sheet, columns: widths }).toBlob()
    downloadBlob(blob, fullFilename(filename, "xlsx"))
    return
  }

  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const autoTable = autoTableMod.default
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" })
  if (title) {
    doc.setFontSize(14)
    doc.setTextColor(17, 24, 39)
    doc.text(title, 40, 40)
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text(`Generated ${new Date().toLocaleString()} • ${rows.length} record${rows.length === 1 ? "" : "s"}`, 40, 56)
  }
  autoTable(doc, {
    head: [matrix[0].map(String)],
    body: matrix.slice(1).map((r) => r.map(String)),
    startY: title ? 72 : 40,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 6, overflow: "linebreak" },
    headStyles: { fillColor: primaryRgb(), textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    didDrawPage: (data) => {
      doc.setFontSize(8)
      doc.setTextColor(156, 163, 175)
      doc.text(
        `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
        doc.internal.pageSize.getWidth() - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: "right" }
      )
    },
  })
  downloadBlob(doc.output("blob"), fullFilename(filename, "pdf"))
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type PageMode = "current" | "specific" | "all"

const FORMAT_OPTIONS: { value: DownloadFormat; label: string; hint: string; Icon: typeof FileSpreadsheet }[] = [
  { value: "xlsx", label: "Excel", hint: ".xlsx", Icon: FileSpreadsheet },
  { value: "csv", label: "CSV", hint: ".csv", Icon: FileType2 },
  { value: "pdf", label: "PDF", hint: ".pdf", Icon: FileText },
]

export function TableDownloadModal<T>({
  open,
  onOpenChange,
  config,
  totalCount,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: TableDownloadConfig<T>
  /** Total record count from the live table query, used to bound page selection. */
  totalCount: number
}) {
  // The body remounts on every open (fresh defaults); runningRef blocks close mid-fetch.
  const runningRef = useRef(false)
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && runningRef.current) return
        onOpenChange(next)
      }}
    >
      {open && (
        <ModalBody config={config} totalCount={totalCount} onClose={() => onOpenChange(false)} runningRef={runningRef} />
      )}
    </Dialog>
  )
}

function ModalBody<T>({
  config,
  totalCount,
  onClose,
  runningRef,
}: {
  config: TableDownloadConfig<T>
  totalCount: number
  onClose: () => void
  runningRef: React.MutableRefObject<boolean>
}) {
  const pageSize = config.pageSize ?? 100
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const initialSelected = useMemo(
    () => new Set(config.columns.filter((c) => c.defaultSelected ?? true).map((c) => c.key)),
    [config.columns]
  )

  const [format, setFormat] = useState<DownloadFormat>("xlsx")
  const [pageMode, setPageMode] = useState<PageMode>("current")
  const [pageInput, setPageInput] = useState<string>(String(config.currentPageNo))
  const [selected, setSelected] = useState<Set<string>>(initialSelected)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [running, setRunningState] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  function setRunning(v: boolean) {
    runningRef.current = v
    setRunningState(v)
  }

  const pageParse = useMemo(
    () => (pageMode === "specific" ? parsePageRange(pageInput, totalPages) : null),
    [pageMode, pageInput, totalPages]
  )
  const selectedColumns = useMemo(() => config.columns.filter((c) => selected.has(c.key)), [config.columns, selected])

  function toggleColumn(key: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function plannedPages(): number[] {
    if (pageMode === "current") return [config.currentPageNo]
    if (pageMode === "all") return Array.from({ length: totalPages }, (_, i) => i + 1)
    return pageParse?.pages ?? []
  }

  async function handleDownload() {
    if (selectedColumns.length === 0) {
      toast.error("Pick at least one column to include")
      return
    }
    const pages = plannedPages()
    if (pages.length === 0) {
      toast.error(pageParse?.error ?? "No pages selected")
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setDownloadError(null)
    setRunning(true)
    setProgress({ done: 0, total: pages.length })
    try {
      const rows = await fetchPagesConcurrent(config.fetchPage, pages, pageSize, {
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      await exportRows(format, { rows, columns: selectedColumns, filename: config.filename, title: config.title })
      toast.success(`Downloaded ${rows.length} record${rows.length === 1 ? "" : "s"}`)
      onClose()
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") {
        toast.info("Download cancelled")
      } else {
        const message = errorMessageOf(e) ?? "Failed to prepare download"
        setDownloadError(message)
        toast.error(message)
      }
    } finally {
      setRunning(false)
      setProgress(null)
      abortRef.current = null
    }
  }

  const allChecked = selected.size === config.columns.length

  return (
    <DialogContent className="max-w-160 gap-0 overflow-hidden rounded-xl p-0 sm:max-w-160" showCloseButton={!running}>
      <div className="flex gap-4 px-6 pt-6 pb-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-[6px] border-primary/5 bg-primary/10 text-primary">
          <Download className="size-4" />
        </span>
        <div className="flex-1">
          <DialogTitle className="text-lg font-semibold text-gray-900">Download {config.title ?? "data"}</DialogTitle>
          <DialogDescription className="mt-0.5 text-sm text-gray-500">
            Choose a format, the pages to include, and which columns to export.
          </DialogDescription>
        </div>
      </div>

      <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 pb-6">
        {downloadError && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {downloadError}
          </div>
        )}

        <Section label="Format">
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as DownloadFormat)} className="grid grid-cols-3 gap-3">
            {FORMAT_OPTIONS.map(({ value, label, hint, Icon }) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                  format === value ? "border-primary bg-primary/5" : "border-gray-200 bg-white hover:bg-gray-50"
                )}
              >
                <RadioGroupItem value={value} className="sr-only" aria-label={label} />
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md",
                    format === value ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                  <span className="text-xs text-gray-500">{hint}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </Section>

        <Section
          label="Pages"
          hint={`Page size for fetches: ${pageSize}. ${totalCount.toLocaleString()} record${totalCount === 1 ? "" : "s"} across ${totalPages} page${totalPages === 1 ? "" : "s"}.`}
        >
          <RadioGroup value={pageMode} onValueChange={(v) => setPageMode(v as PageMode)} className="space-y-3">
            <PageOption value="current" title="Current page" description={`Just page ${config.currentPageNo}.`} />
            <PageOption
              value="specific"
              title="Specific pages"
              description="Comma-separated, supports ranges (e.g. 1, 3, 5-7)."
            >
              {pageMode === "specific" && (
                <div className="mt-2 space-y-1">
                  <Input
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    placeholder="1, 3, 5-7"
                    aria-invalid={!!pageParse?.error}
                  />
                  {pageParse?.error ? (
                    <p className="text-xs text-destructive">{pageParse.error}</p>
                  ) : pageParse?.pages ? (
                    <p className="text-xs text-gray-500">
                      {pageParse.pages.length} page{pageParse.pages.length === 1 ? "" : "s"} selected
                    </p>
                  ) : null}
                </div>
              )}
            </PageOption>
            <PageOption
              value="all"
              title="All pages"
              description={`Every page (${totalPages} request${totalPages === 1 ? "" : "s"}).`}
            />
          </RadioGroup>
        </Section>

        <Section
          label="Columns"
          action={
            <button
              type="button"
              className="cursor-pointer text-sm font-medium text-primary hover:opacity-80"
              onClick={() => setSelected(allChecked ? new Set() : new Set(config.columns.map((c) => c.key)))}
            >
              {allChecked ? "Deselect all" : "Select all"}
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-2">
            {config.columns.map((col) => (
              <label key={col.key} className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-gray-700">
                <Checkbox
                  checked={selected.has(col.key)}
                  onCheckedChange={(c) => toggleColumn(col.key, c === true)}
                  aria-label={col.label}
                />
                <span className="truncate">{col.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {selected.size} of {config.columns.length} column{config.columns.length === 1 ? "" : "s"} selected
          </p>
        </Section>

        {progress && (
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-primary">Fetching pages…</span>
              <span className="text-xs text-primary tabular-nums">
                {progress.done} / {progress.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50/50 px-6 py-4">
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={running}>
            Cancel
          </Button>
        </DialogClose>
        {running ? (
          <Button type="button" variant="destructive" onClick={() => abortRef.current?.abort()}>
            Stop
          </Button>
        ) : (
          <Button type="button" onClick={handleDownload}>
            <Download className="size-4" />
            Download
          </Button>
        )}
      </div>
    </DialogContent>
  )
}

function Section({
  label,
  hint,
  action,
  children,
}: {
  label: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        {action}
      </div>
      {hint && <p className="mb-3 text-xs text-gray-500">{hint}</p>}
      {children}
    </div>
  )
}

function PageOption({
  value,
  title,
  description,
  children,
}: {
  value: string
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <RadioGroupItem value={value} className="mt-0.5" aria-label={title} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        {children}
      </div>
    </label>
  )
}
