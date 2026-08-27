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
  formatPortfolioMoney,
  formatPortfolioMoneyCompact,
  kpiDeltaLabel,
  portfolioAccountStatusTone,
  portfolioStatusLabel,
  titleCaseStatus,
  unwrapProductOverviewByType,
  type OverviewTone,
  type PortfolioStatusFilter,
  type ProductOverviewByTypeData,
  type ProductOverviewTabKey,
} from "@/lib/productOverview"

const PANEL = "rounded-[14px] border border-[#E7E5E0] bg-white"
const PAGE_SIZE = 50

type TabKey = ProductOverviewTabKey

const TAB_META: {
  key: TabKey
  label: string
  icon: LucideIcon
  apiType: "LOAN" | "MORTGAGE" | "SAVINGS" | "INVESTMENT" | "COMMODITY"
}[] = [
  { key: "loan", label: "Loan", icon: Banknote, apiType: "LOAN" },
  { key: "mortgage", label: "Mortgage", icon: Home, apiType: "MORTGAGE" },
  { key: "savings", label: "Savings", icon: PiggyBank, apiType: "SAVINGS" },
  { key: "investment", label: "Investment", icon: TrendingUp, apiType: "INVESTMENT" },
  { key: "commodity", label: "Commodity", icon: Package, apiType: "COMMODITY" },
]

const LOAN_KPI_CARDS: {
  id: Exclude<PortfolioStatusFilter, "all">
  label: string
  fallbackNote: string
  tone: OverviewTone
  dotClass: string
}[] = [
  {
    id: "active",
    label: "Active loan",
    fallbackNote: "+0 this month",
    tone: "success",
    dotClass: "bg-[#2E9E52]",
  },
  {
    id: "inactive",
    label: "Inactive loan",
    fallbackNote: "Matured or closed",
    tone: "muted",
    dotClass: "bg-[#9A9A94]",
  },
  {
    id: "non_performing",
    label: "Non-performing loan",
    fallbackNote: "90+ days overdue",
    tone: "warning",
    dotClass: "bg-[#D3900B]",
  },
  {
    id: "bad",
    label: "Bad loan",
    fallbackNote: "Written off",
    tone: "danger",
    dotClass: "bg-[#C23A3A]",
  },
]

const TONE_BADGE: Record<OverviewTone, string> = {
  success: "bg-[#DCF5E3] text-[#1C7A3B]",
  muted: "bg-[#EEEEEC] text-[#6B6B66]",
  warning: "bg-[#FBF0D9] text-[#92650F]",
  danger: "bg-[#FBE1E1] text-[#B23B3B]",
  gold: "bg-[#F7EEDD] text-[#96723F]",
  info: "bg-[#EEEEEC] text-[#6B6B66]",
}

function emptyByType(): ProductOverviewByTypeData {
  return {
    activeLoan: { count: 0, subtitle: "+0 this month" },
    inactiveLoan: { count: 0, subtitle: "Matured or closed" },
    nonPerformingLoan: { count: 0, subtitle: "90+ days overdue" },
    badLoan: { count: 0, subtitle: "Written off" },
    repaymentDue: null,
    loanAccounts: [],
    repayments: [],
    failedRepayments: [],
  }
}

function StatusBadge({ label, tone }: { label: string; tone: OverviewTone }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-[11px] py-1 text-[11px] font-bold",
        TONE_BADGE[tone],
      )}
    >
      {label}
    </span>
  )
}

function OverviewSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${PANEL} px-[18px] py-4`}>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-[72px] w-full rounded-[14px]" />
      <div className={`${PANEL} p-5`}>
        <TableSkeleton columnCount={5} rowCount={5} />
      </div>
    </div>
  )
}

function kpiValueFor(
  data: ProductOverviewByTypeData,
  id: Exclude<PortfolioStatusFilter, "all">,
) {
  switch (id) {
    case "active":
      return data.activeLoan
    case "inactive":
      return data.inactiveLoan
    case "non_performing":
      return data.nonPerformingLoan
    case "bad":
      return data.badLoan
  }
}

export default function ProductOverviewDashboard({
  appId,
  appName,
}: {
  appId?: string
  appName?: string
}) {
  const [activeType, setActiveType] = useState<TabKey>("loan")
  const [portfolioStatus, setPortfolioStatus] = useState<PortfolioStatusFilter>("all")
  const [data, setData] = useState<ProductOverviewByTypeData | null>(null)
  const [loading, setLoading] = useState(Boolean(appId))
  const [error, setError] = useState<string | null>(null)

  const activeMeta = TAB_META.find((t) => t.key === activeType) ?? TAB_META[0]
  const isLoanTab = activeType === "loan"

  useEffect(() => {
    if (!appId) {
      setLoading(false)
      setError("Missing app id.")
      return
    }

    // Only Loan has a completed portfolio design + portfolioStatus contract for now.
    if (!isLoanTab) {
      setData(emptyByType())
      setLoading(false)
      setError(null)
      return
    }

    const ac = new AbortController()
    setLoading(true)
    setError(null)

    void productApi
      .getProductOverviewByType(
        {
          appId,
          productType: activeMeta.apiType,
          portfolioStatus,
          limit: PAGE_SIZE,
          skip: 0,
        },
        ac.signal,
      )
      .then((res) => {
        setData(unwrapProductOverviewByType(res))
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        const msg = err instanceof Error ? err.message : "Failed to load product overview"
        setError(msg)
        setData(null)
        toast.error(msg)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })

    return () => ac.abort()
  }, [appId, activeMeta.apiType, isLoanTab, portfolioStatus])

  const overview = data ?? emptyByType()

  const kpis = useMemo(
    () =>
      LOAN_KPI_CARDS.map((card) => {
        const bucket = kpiValueFor(overview, card.id)
        return {
          ...card,
          value: countMajor(bucket.count),
          note: kpiDeltaLabel(bucket, card.fallbackNote),
        }
      }),
    [overview],
  )

  function handleKpiClick(next: Exclude<PortfolioStatusFilter, "all">) {
    setPortfolioStatus((prev) => (prev === next ? "all" : next))
  }

  function handleTypeChange(next: TabKey) {
    setActiveType(next)
    setPortfolioStatus("all")
  }

  const due = overview.repaymentDue
  const showingLabel = portfolioStatusLabel(portfolioStatus)
  const showSkeleton = loading && !data && isLoanTab

  return (
    <div className="min-h-full w-full bg-[#FAFAF9] text-[#14171F] tabular-nums">
      <div className="w-full px-6 pb-14 pt-7 sm:px-8">
        <header className="mb-[22px]">
          <h1 className="text-[26px] font-bold text-[#14171F]">Product overview</h1>
          <p className="mt-1.5 text-sm text-[#6B7280]">
            Live activity across every product type {appName || "your app"} has published on Plata.
          </p>
        </header>

        <nav
          className="mb-6 flex flex-wrap gap-[26px] border-b border-[#E7E5E0]"
          aria-label="Product type"
        >
          {TAB_META.map((entry) => {
            const Icon = entry.icon
            const isActive = entry.key === activeType
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => handleTypeChange(entry.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 pb-3 pt-3 text-sm font-semibold transition-colors",
                  isActive
                    ? "border-[#B08D57] text-[#96723F]"
                    : "border-transparent text-[#6B7280] hover:text-[#14171F]",
                )}
              >
                <Icon className="h-4 w-4" />
                {entry.label}
              </button>
            )
          })}
        </nav>

        {error && isLoanTab ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        {!isLoanTab ? (
          <div className={`${PANEL} px-6 py-16 text-center`}>
            <p className="text-base font-semibold text-[#14171F]">{activeMeta.label} overview</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#6B7280]">
              The portfolio layout for {activeMeta.label.toLowerCase()} is not available yet. Use the Loan
              tab for active / inactive / non-performing / bad account filtering.
            </p>
          </div>
        ) : showSkeleton ? (
          <OverviewSkeleton />
        ) : (
          <>
            <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi) => {
                const selected = portfolioStatus === kpi.id
                return (
                  <button
                    key={kpi.id}
                    type="button"
                    data-filter={kpi.id}
                    onClick={() => handleKpiClick(kpi.id)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-[14px] border px-[18px] py-4 text-left transition-colors",
                      selected
                        ? "border-[#B08D57] bg-[#F7EEDD]"
                        : "border-[#E7E5E0] bg-white hover:border-[#B08D57]",
                    )}
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
                      <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", kpi.dotClass)} />
                      {kpi.label}
                    </span>
                    <span className="mt-2.5 block text-2xl font-bold leading-none text-[#14171F]">
                      {kpi.value}
                    </span>
                    <span className="mt-1.5 block text-xs text-[#9A9A94]">{kpi.note}</span>
                  </button>
                )
              })}
            </div>

            {due ? (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-[#F7EEDD] px-5 py-[18px]">
                <div>
                  <p className="text-[13px] font-semibold text-[#96723F]">
                    {due.label || "Repayment due this week"}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {due.subtitle ||
                      `${countMajor(due.repaymentCount)} repayments across ${countMajor(due.activeLoanCount ?? overview.activeLoan.count)} active loans`}
                  </p>
                </div>
                <span className="text-xl font-bold text-[#14171F]">
                  {formatPortfolioMoneyCompact(due.amount)}
                </span>
              </div>
            ) : null}

            <section className={cn(PANEL, "mb-5 px-[22px] py-5", loading && "opacity-70")}>
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[15px] font-bold text-[#14171F]">Loans</p>
                <div className="flex items-center gap-2.5 text-xs text-[#6B7280]">
                  <span>
                    Showing: <strong className="font-bold text-[#96723F]">{showingLabel}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPortfolioStatus("all")}
                    className="rounded-full bg-[#EEEEEC] px-3 py-1 text-[11px] font-bold text-[#6B6B66]"
                  >
                    View all
                  </button>
                </div>
              </div>

              {loading && overview.loanAccounts.length === 0 ? (
                <TableSkeleton columnCount={5} rowCount={5} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-[13px]">
                    <thead>
                      <tr>
                        {["Loan ref", "Customer", "Principal", "Status", "Disbursed"].map((label, i) => (
                          <th
                            key={label}
                            className={cn(
                              "border-b border-[#E7E5E0] pb-2.5 text-[11px] font-bold uppercase tracking-[0.02em] text-[#9A9A94]",
                              i === 2 ? "px-3 text-right" : "px-3 text-left",
                            )}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overview.loanAccounts.map((row, index) => {
                        const status = row.portfolioStatus || row.status || "—"
                        return (
                          <tr key={row.id || row.loanRef || `loan-${index}`}>
                            <td className="border-b border-[#E7E5E0] px-3 py-[13px] text-[#14171F]">
                              {row.loanRef || "—"}
                            </td>
                            <td className="border-b border-[#E7E5E0] px-3 py-[13px] text-[#14171F]">
                              {row.customerName || "—"}
                            </td>
                            <td className="border-b border-[#E7E5E0] px-3 py-[13px] text-right text-[#14171F]">
                              {formatPortfolioMoney(row.principal)}
                            </td>
                            <td className="border-b border-[#E7E5E0] px-3 py-[13px]">
                              <StatusBadge
                                label={titleCaseStatus(status)}
                                tone={portfolioAccountStatusTone(status)}
                              />
                            </td>
                            <td className="border-b border-[#E7E5E0] px-3 py-[13px] text-[#14171F]">
                              {formatOverviewDate(row.disbursedAt)}
                            </td>
                          </tr>
                        )
                      })}
                      {overview.loanAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-sm text-[#9A9A94]">
                            No loans match this portfolio filter.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className={`${PANEL} mb-5 px-[22px] py-5`}>
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <p className="text-[15px] font-bold text-[#14171F]">Repayments</p>
                <span className="text-xs text-[#9A9A94]">Last {Math.min(5, overview.repayments.length) || 5}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {["Loan ref", "Customer", "Amount", "Date", "Status"].map((label, i) => (
                        <th
                          key={label}
                          className={cn(
                            "border-b border-[#E7E5E0] pb-2.5 text-[11px] font-bold uppercase tracking-[0.02em] text-[#9A9A94]",
                            i === 2 ? "px-3 text-right" : "px-3 text-left",
                          )}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overview.repayments.slice(0, 5).map((row, index) => (
                      <tr key={row.id || `repay-${index}`}>
                        <td className="border-b border-[#E7E5E0] px-3 py-[13px]">{row.loanRef || "—"}</td>
                        <td className="border-b border-[#E7E5E0] px-3 py-[13px]">{row.customerName || "—"}</td>
                        <td className="border-b border-[#E7E5E0] px-3 py-[13px] text-right">
                          {formatPortfolioMoney(row.amount)}
                        </td>
                        <td className="border-b border-[#E7E5E0] px-3 py-[13px]">
                          {formatOverviewDate(row.date)}
                        </td>
                        <td className="border-b border-[#E7E5E0] px-3 py-[13px]">
                          <StatusBadge
                            label={titleCaseStatus(row.status || "Success")}
                            tone={portfolioAccountStatusTone(row.status || "success")}
                          />
                        </td>
                      </tr>
                    ))}
                    {overview.repayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-[#9A9A94]">
                          No recent repayments.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`${PANEL} px-[22px] py-5`}>
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <p className="text-[15px] font-bold text-[#14171F]">Failed repayment</p>
                <span className="text-xs text-[#9A9A94]">
                  Last {Math.min(5, overview.failedRepayments.length) || 5}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      {["Loan ref", "Customer", "Amount", "Date", "Reason"].map((label, i) => (
                        <th
                          key={label}
                          className={cn(
                            "border-b border-[#E7E5E0] pb-2.5 text-[11px] font-bold uppercase tracking-[0.02em] text-[#9A9A94]",
                            i === 2 ? "px-3 text-right" : "px-3 text-left",
                          )}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overview.failedRepayments.slice(0, 5).map((row, index) => (
                      <tr key={row.id || `failed-${index}`}>
                        <td className="border-b border-[#E7E5E0] px-3 py-[13px]">{row.loanRef || "—"}</td>
                        <td className="border-b border-[#E7E5E0] px-3 py-[13px]">{row.customerName || "—"}</td>
                        <td className="border-b border-[#E7E5E0] px-3 py-[13px] text-right">
                          {formatPortfolioMoney(row.amount)}
                        </td>
                        <td className="border-b border-[#E7E5E0] px-3 py-[13px]">
                          {formatOverviewDate(row.date)}
                        </td>
                        <td className="border-b border-[#E7E5E0] px-3 py-[13px]">
                          <StatusBadge
                            label={titleCaseStatus(row.reason || row.status || "Failed")}
                            tone="danger"
                          />
                        </td>
                      </tr>
                    ))}
                    {overview.failedRepayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-sm text-[#9A9A94]">
                          No failed repayments.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
