"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Banknote,
  Home,
  Package,
  PiggyBank,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { productApi } from "@/lib/services/product-api"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import {
  countMajor,
  formatOverviewDate,
  productStatusTone,
  titleCaseStatus,
  unwrapCatalogOverview,
  unwrapCatalogProductList,
  type CatalogProductItem,
  type CatalogProductOverview,
  type CatalogProductPagination,
  type CatalogStatusFilter,
  type OverviewTone,
  type ProductOverviewTabKey,
} from "@/lib/productOverview"

const CARD = "rounded-xl border border-[#E7E5E0] bg-white"
const HEADING = "text-base font-medium text-[#1C1917]"
const OUTLINE_BUTTON =
  "rounded-lg border border-[#E7E5E0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#78716C] transition-colors hover:bg-[#FAFAF9]"

const TONE_DOT: Record<OverviewTone, string> = {
  success: "bg-[#1D9E75]",
  muted: "bg-[#A8A29E]",
  warning: "bg-[#C9852E]",
  danger: "bg-[#C0392B]",
  gold: "bg-[#B08D57]",
  info: "bg-[#2563EB]",
}

const TONE_NOTE: Record<OverviewTone, string> = {
  success: "text-[#157F5E]",
  muted: "text-[#78716C]",
  warning: "text-[#A9701F]",
  danger: "text-[#B3372C]",
  gold: "text-[#96723F]",
  info: "text-[#1D4ED8]",
}

const TONE_BADGE: Record<OverviewTone, string> = {
  success: "bg-[rgba(29,158,117,0.12)] text-[#157F5E]",
  muted: "bg-[rgba(120,113,108,0.12)] text-[#57534E]",
  warning: "bg-[rgba(201,133,46,0.14)] text-[#A9701F]",
  danger: "bg-[rgba(192,57,43,0.12)] text-[#B3372C]",
  gold: "bg-[#F7EEDD] text-[#96723F]",
  info: "bg-[rgba(37,99,235,0.12)] text-[#1D4ED8]",
}

const PAGE_SIZE = 20

type TabKey = ProductOverviewTabKey

const TAB_META: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "loan", label: "Loan", icon: Banknote },
  { key: "mortgage", label: "Mortgage", icon: Home },
  { key: "savings", label: "Savings", icon: PiggyBank },
  { key: "investment", label: "Investment", icon: TrendingUp },
  { key: "commodity", label: "Commodity", icon: Package },
]

const STATUS_CARDS: {
  id: CatalogStatusFilter
  label: string
  note: string
  tone: OverviewTone
}[] = [
  { id: "all", label: "All products", note: "Every product on this app", tone: "info" },
  { id: "active", label: "Active", note: "Published and live", tone: "success" },
  { id: "inactive", label: "Inactive", note: "Turned off", tone: "muted" },
  { id: "pendingConfiguration", label: "Pending configuration", note: "Not configured yet", tone: "warning" },
  { id: "featured", label: "Featured", note: "Highlighted products", tone: "gold" },
]

function OverviewSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${CARD} px-5 py-4`}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className={`${CARD} p-5 sm:p-6`}>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
        <div className="mt-4">
          <TableSkeleton columnCount={7} rowCount={4} />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className={`${CARD} mt-6 px-6 py-16 text-center`}>
      <p className="text-base font-medium text-[#1C1917]">{title}</p>
      <p className="mt-1.5 text-sm text-[#78716C]">{description}</p>
    </div>
  )
}

function Badge({ label, tone }: { label: string; tone: OverviewTone }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        TONE_BADGE[tone],
      )}
    >
      {label}
    </span>
  )
}

export default function ProductOverviewDashboard({
  appId,
  appName,
}: {
  appId?: string
  appName?: string
}) {
  const [activeType, setActiveType] = useState<TabKey | "all">("all")
  const [statusFilter, setStatusFilter] = useState<CatalogStatusFilter>("all")
  const [page, setPage] = useState(1)

  const [overview, setOverview] = useState<CatalogProductOverview | null>(null)
  const [items, setItems] = useState<CatalogProductItem[]>([])
  const [pagination, setPagination] = useState<CatalogProductPagination | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(Boolean(appId))
  const [loadingList, setLoadingList] = useState(Boolean(appId))
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    if (!appId) {
      setLoadingOverview(false)
      setOverviewError("Missing app id.")
      return
    }
    const ac = new AbortController()
    setLoadingOverview(true)
    setOverviewError(null)
    void productApi
      .getProductOverview(appId, ac.signal)
      .then((res) => {
        setOverview(unwrapCatalogOverview(res))
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        const msg = err instanceof Error ? err.message : "Failed to load product overview"
        setOverviewError(msg)
        toast.error(msg)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingOverview(false)
      })
    return () => ac.abort()
  }, [appId])

  useEffect(() => {
    if (!appId) {
      setLoadingList(false)
      setItems([])
      return
    }
    const ac = new AbortController()
    setLoadingList(true)
    setListError(null)
    void productApi
      .listProducts(
        {
          appId,
          status: statusFilter,
          type: activeType,
          page,
          limit: PAGE_SIZE,
        },
        ac.signal,
      )
      .then((res) => {
        const list = unwrapCatalogProductList(res)
        setItems(list.items ?? [])
        setPagination(list.pagination ?? null)
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        const msg = err instanceof Error ? err.message : "Failed to load products"
        setListError(msg)
        toast.error(msg)
        setItems([])
        setPagination(null)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingList(false)
      })
    return () => ac.abort()
  }, [appId, statusFilter, activeType, page])

  const totals = overview?.totals
  const byType = overview?.byType
  const totalPages = Math.max(1, pagination?.totalPages ?? 1)
  const totalRows = pagination?.total ?? items.length
  const showSkeleton = loadingOverview && !overview
  const listRefreshing = loadingList && items.length > 0

  const typeLabel = activeType === "all" ? "all types" : TAB_META.find((t) => t.key === activeType)?.label.toLowerCase()
  const statusLabel =
    statusFilter === "all"
      ? "all statuses"
      : STATUS_CARDS.find((c) => c.id === statusFilter)?.label.toLowerCase()

  const kpis = useMemo(
    () =>
      STATUS_CARDS.map((card) => ({
        ...card,
        value: countMajor(totals?.[card.id] ?? 0),
      })),
    [totals],
  )

  function handleStatusClick(next: CatalogStatusFilter) {
    setStatusFilter((prev) => (prev === next && next !== "all" ? "all" : next))
    setPage(1)
  }

  function handleTypeChange(next: TabKey | "all") {
    setActiveType(next)
    setPage(1)
  }

  return (
    <div className="min-h-full w-full bg-[#FAFAF9] text-[#1C1917] tabular-nums">
      <div className="w-full px-6 pb-16 pt-5 sm:px-8">
        <header>
          <h1 className="text-2xl font-semibold text-[#1C1917]">Product overview</h1>
          <p className="mt-1.5 text-sm text-[#78716C]">
            Counts and filtered products for {appName || "your app"}. Click a card or type to reload the table from the
            backend.
          </p>
        </header>

        {overviewError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {overviewError}
          </p>
        ) : null}

        {showSkeleton ? (
          <OverviewSkeleton />
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {kpis.map((kpi) => {
                const selected = statusFilter === kpi.id
                return (
                  <button
                    key={kpi.id}
                    type="button"
                    onClick={() => handleStatusClick(kpi.id)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-xl border bg-white px-5 py-4 text-left transition-colors",
                      selected ? "border-[#B08D57] ring-1 ring-[#B08D57]/40" : "border-[#E7E5E0]",
                      "cursor-pointer hover:border-[#B08D57]/60",
                    )}
                  >
                    <span className="flex items-center gap-2 text-[13px] text-[#78716C]">
                      <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[kpi.tone])} />
                      {kpi.label}
                    </span>
                    <span className="mt-2.5 block text-[26px] font-semibold leading-none text-[#1C1917]">
                      {kpi.value}
                    </span>
                    <span className={cn("mt-2 block text-xs", TONE_NOTE[kpi.tone])}>{kpi.note}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <nav className="flex flex-wrap gap-2" aria-label="Product type">
                <button
                  type="button"
                  onClick={() => handleTypeChange("all")}
                  aria-current={activeType === "all" ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    activeType === "all"
                      ? "border-[#B08D57] bg-[#F7EEDD] text-[#96723F]"
                      : "border-[#E7E5E0] bg-white text-[#78716C] hover:border-[#D6D3CE] hover:text-[#1C1917]",
                  )}
                >
                  All
                  {typeof totals?.all === "number" ? (
                    <span className="rounded-full bg-[#F5F5F4] px-1.5 py-0.5 text-[11px] text-[#57534E]">
                      {totals.all}
                    </span>
                  ) : null}
                </button>
                {TAB_META.map((entry) => {
                  const Icon = entry.icon
                  const isActive = entry.key === activeType
                  const configured = byType?.[entry.key]
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => handleTypeChange(entry.key)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "border-[#B08D57] bg-[#F7EEDD] text-[#96723F]"
                          : "border-[#E7E5E0] bg-white text-[#78716C] hover:border-[#D6D3CE] hover:text-[#1C1917]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {entry.label}
                      {typeof configured === "number" ? (
                        <span className="rounded-full bg-[#F5F5F4] px-1.5 py-0.5 text-[11px] text-[#57534E]">
                          {configured}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </nav>
            </div>

            {listError ? (
              <EmptyState title="Couldn’t load products" description={listError} />
            ) : (
              <section className={cn(CARD, "mt-4 p-5 sm:p-6", listRefreshing && "opacity-60")}>
                <h2 className={HEADING}>Products</h2>
                <p className="mt-1 text-sm text-[#78716C]">
                  {countMajor(totalRows)} result{totalRows === 1 ? "" : "s"} · {statusLabel} · {typeLabel}
                </p>
                {loadingList && items.length === 0 ? (
                  <div className="mt-4">
                    <TableSkeleton columnCount={7} rowCount={5} />
                  </div>
                ) : (
                  <>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[760px] border-collapse text-sm">
                        <thead>
                          <tr>
                            {["Product", "Reference", "Type", "Status", "Configured", "Featured", "Created"].map(
                              (label) => (
                                <th
                                  key={label}
                                  className="border-b border-[#E7E5E0] px-3 pb-2.5 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-[#A8A29E]"
                                >
                                  {label}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((row) => (
                            <tr key={row.id || row.referenceNumber}>
                              <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                                {row.name?.trim() || "—"}
                              </td>
                              <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                                {row.referenceNumber?.trim() || row.id || "—"}
                              </td>
                              <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                                {titleCaseStatus(row.type)}
                              </td>
                              <td className="border-b border-[#E7E5E0] px-3 py-3.5">
                                <Badge
                                  label={titleCaseStatus(row.status)}
                                  tone={productStatusTone(row.status, row.isActive, row.isFeatured)}
                                />
                              </td>
                              <td className="border-b border-[#E7E5E0] px-3 py-3.5">
                                <Badge
                                  label={row.configured ? "Yes" : "No"}
                                  tone={row.configured ? "success" : "warning"}
                                />
                              </td>
                              <td className="border-b border-[#E7E5E0] px-3 py-3.5">
                                <Badge
                                  label={row.isFeatured ? "Featured" : "—"}
                                  tone={row.isFeatured ? "gold" : "muted"}
                                />
                              </td>
                              <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                                {formatOverviewDate(row.createdAt)}
                              </td>
                            </tr>
                          ))}
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-8 text-center text-sm text-[#78716C]">
                                No products match this filter.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 ? (
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-xs text-[#78716C]">
                          Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={OUTLINE_BUTTON}
                            disabled={page <= 1 || loadingList}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            className={OUTLINE_BUTTON}
                            disabled={page >= totalPages || loadingList}
                            onClick={() => setPage((p) => p + 1)}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
