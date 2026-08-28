"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
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
  commodityPortfolioStatusLabel,
  formatInvestmentActivity,
  formatSavingsActivity,
  investmentPortfolioStatusLabel,
  kpiDeltaLabel,
  liquidationStatusLabel,
  liquidationStatusTone,
  mortgagePortfolioStatusLabel,
  portfolioAccountStatusTone,
  portfolioStatusLabel,
  savingsAccountStatusLabel,
  savingsAccountStatusTone,
  savingsPortfolioStatusLabel,
  simplePortfolioStatus,
  titleCaseStatus,
  unwrapCommodityProductOverviewByType,
  unwrapInvestmentProductOverviewByType,
  unwrapMortgageProductOverviewByType,
  unwrapProductOverviewByType,
  unwrapSavingsProductOverviewByType,
  type CommodityPortfolioStatusFilter,
  type InvestmentPortfolioStatusFilter,
  type OverviewTone,
  type PortfolioStatusFilter,
  type ProductOverviewByTypeData,
  type ProductOverviewCommodityData,
  type ProductOverviewInvestmentData,
  type ProductOverviewSavingsData,
  type ProductOverviewTabKey,
  type SavingsPortfolioStatusFilter,
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

const MORTGAGE_KPI_CARDS: typeof LOAN_KPI_CARDS = [
  {
    id: "active",
    label: "Active mortgage",
    fallbackNote: "+0 this month",
    tone: "success",
    dotClass: "bg-[#2E9E52]",
  },
  {
    id: "inactive",
    label: "Inactive mortgage",
    fallbackNote: "Matured or closed",
    tone: "muted",
    dotClass: "bg-[#9A9A94]",
  },
  {
    id: "non_performing",
    label: "Non-performing mortgage",
    fallbackNote: "90+ days overdue",
    tone: "warning",
    dotClass: "bg-[#D3900B]",
  },
  {
    id: "bad",
    label: "Bad mortgage",
    fallbackNote: "Written off",
    tone: "danger",
    dotClass: "bg-[#C23A3A]",
  },
]

const SAVINGS_KPI_CARDS: {
  id?: Exclude<SavingsPortfolioStatusFilter, "all">
  label: string
  fallbackNote: string
  dotClass: string
  filterable: boolean
}[] = [
  {
    id: "active",
    label: "Active savings",
    fallbackNote: "+0 this month",
    dotClass: "bg-[#2E9E52]",
    filterable: true,
  },
  {
    id: "inactive",
    label: "Closed savings",
    fallbackNote: "Matured or withdrawn in full",
    dotClass: "bg-[#9A9A94]",
    filterable: true,
  },
  {
    label: "Savings withdrawal",
    fallbackNote: "0 withdrawals this month",
    dotClass: "bg-[#B08D57]",
    filterable: false,
  },
]

const INVESTMENT_KPI_CARDS: {
  id: Exclude<InvestmentPortfolioStatusFilter, "all">
  label: string
  fallbackNote: string
  dotClass: string
}[] = [
  {
    id: "active",
    label: "Active investment",
    fallbackNote: "+0 this month",
    dotClass: "bg-[#2E9E52]",
  },
  {
    id: "inactive",
    label: "Closed investment",
    fallbackNote: "Matured or liquidated in full",
    dotClass: "bg-[#9A9A94]",
  },
]

const COMMODITY_KPI_CARDS: typeof INVESTMENT_KPI_CARDS = [
  {
    id: "active",
    label: "Active commodity",
    fallbackNote: "+0 this month",
    dotClass: "bg-[#2E9E52]",
  },
  {
    id: "inactive",
    label: "Closed commodity",
    fallbackNote: "Matured or liquidated in full",
    dotClass: "bg-[#9A9A94]",
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

function emptyLoanByType(): ProductOverviewByTypeData {
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

function emptySavingsByType(): ProductOverviewSavingsData {
  return {
    activeSavingsPlan: { count: 0, subtitle: "+0 this month" },
    inactiveSavingsPlan: { count: 0, subtitle: "Matured or withdrawn in full" },
    savingsWithdrawalsThisMonth: { amount: 0, count: 0 },
    savingsAccounts: [],
    recentContributions: [],
    withdrawalRequests: [],
    pendingWithdrawal: { count: 0 },
  }
}

function emptyInvestmentByType(): ProductOverviewInvestmentData {
  return {
    activeInvestment: { count: 0, subtitle: "+0 this month" },
    maturedInvestment: { count: 0, subtitle: "Matured or liquidated in full" },
    investmentAccounts: [],
    recentActivity: [],
    liquidationRequests: [],
    approvedLiquidations: [],
    pendingLiquidation: { count: 0 },
  }
}

function emptyCommodityByType(): ProductOverviewCommodityData {
  return {
    activeCommodityPlan: { count: 0, subtitle: "+0 this month" },
    completedCommodityPlan: { count: 0, subtitle: "Matured or liquidated in full" },
    commodityAccounts: [],
    recentActivity: [],
    liquidationRequests: [],
    approvedLiquidations: [],
    pendingLiquidation: { count: 0 },
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

function ActivityPill({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full bg-[#EEEEEC] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#6B6B66]">
      {label}
    </span>
  )
}

function OverviewSkeleton({ kpiCount = 4 }: { kpiCount?: number }) {
  const lgCols =
    kpiCount === 2 ? "lg:grid-cols-2" : kpiCount === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
  return (
    <div className="mt-6 space-y-4">
      <div className={cn("grid grid-cols-1 gap-3.5 sm:grid-cols-2", lgCols)}>
        {Array.from({ length: kpiCount }).map((_, i) => (
          <div key={i} className={`${PANEL} px-[18px] py-4`}>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className={`${PANEL} p-5`}>
        <TableSkeleton columnCount={5} rowCount={5} />
      </div>
    </div>
  )
}

function kpiValueForLoan(
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
  const [portfolioStatus, setPortfolioStatus] = useState<
    PortfolioStatusFilter | SavingsPortfolioStatusFilter
  >("all")
  const [loanData, setLoanData] = useState<ProductOverviewByTypeData | null>(null)
  const [mortgageData, setMortgageData] = useState<ProductOverviewByTypeData | null>(null)
  const [savingsData, setSavingsData] = useState<ProductOverviewSavingsData | null>(null)
  const [investmentData, setInvestmentData] = useState<ProductOverviewInvestmentData | null>(null)
  const [commodityData, setCommodityData] = useState<ProductOverviewCommodityData | null>(null)
  const [loading, setLoading] = useState(Boolean(appId))
  const [error, setError] = useState<string | null>(null)

  const activeMeta = TAB_META.find((t) => t.key === activeType) ?? TAB_META[0]
  const isLoanTab = activeType === "loan"
  const isMortgageTab = activeType === "mortgage"
  const isSavingsTab = activeType === "savings"
  const isInvestmentTab = activeType === "investment"
  const isCommodityTab = activeType === "commodity"
  const isLendingTab = isLoanTab || isMortgageTab
  const isPortfolioTab = isLendingTab || isSavingsTab || isInvestmentTab || isCommodityTab

  useEffect(() => {
    if (!appId) {
      setLoading(false)
      setError("Missing app id.")
      return
    }

    if (!isPortfolioTab) {
      setLoading(false)
      setError(null)
      return
    }

    const ac = new AbortController()
    setLoading(true)
    setError(null)

    const statusForApi = isLendingTab
      ? (portfolioStatus as PortfolioStatusFilter)
      : simplePortfolioStatus(portfolioStatus)

    void productApi
      .getProductOverviewByType(
        {
          appId,
          productType: activeMeta.apiType,
          portfolioStatus: statusForApi as PortfolioStatusFilter,
          limit: PAGE_SIZE,
          skip: 0,
        },
        ac.signal,
      )
      .then((res) => {
        if (isSavingsTab) {
          setSavingsData(unwrapSavingsProductOverviewByType(res))
        } else if (isInvestmentTab) {
          setInvestmentData(unwrapInvestmentProductOverviewByType(res))
        } else if (isCommodityTab) {
          setCommodityData(unwrapCommodityProductOverviewByType(res))
        } else if (isMortgageTab) {
          setMortgageData(unwrapMortgageProductOverviewByType(res))
        } else {
          setLoanData(unwrapProductOverviewByType(res))
        }
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        const msg = err instanceof Error ? err.message : "Failed to load product overview"
        setError(msg)
        if (isSavingsTab) setSavingsData(null)
        else if (isInvestmentTab) setInvestmentData(null)
        else if (isCommodityTab) setCommodityData(null)
        else if (isMortgageTab) setMortgageData(null)
        else setLoanData(null)
        toast.error(msg)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })

    return () => ac.abort()
  }, [
    appId,
    activeMeta.apiType,
    isPortfolioTab,
    isSavingsTab,
    isInvestmentTab,
    isCommodityTab,
    isMortgageTab,
    isLoanTab,
    isLendingTab,
    portfolioStatus,
  ])

  const loanOverview = loanData ?? emptyLoanByType()
  const mortgageOverview = mortgageData ?? emptyLoanByType()
  const savingsOverview = savingsData ?? emptySavingsByType()
  const investmentOverview = investmentData ?? emptyInvestmentByType()
  const commodityOverview = commodityData ?? emptyCommodityByType()

  const loanKpis = useMemo(
    () =>
      LOAN_KPI_CARDS.map((card) => {
        const bucket = kpiValueForLoan(loanOverview, card.id)
        return {
          ...card,
          value: countMajor(bucket.count),
          note: kpiDeltaLabel(bucket, card.fallbackNote),
        }
      }),
    [loanOverview],
  )

  const mortgageKpis = useMemo(
    () =>
      MORTGAGE_KPI_CARDS.map((card) => {
        const bucket = kpiValueForLoan(mortgageOverview, card.id)
        return {
          ...card,
          value: countMajor(bucket.count),
          note: kpiDeltaLabel(bucket, card.fallbackNote),
        }
      }),
    [mortgageOverview],
  )

  const savingsKpis = useMemo(
    () =>
      SAVINGS_KPI_CARDS.map((card) => {
        if (!card.filterable) {
          const w = savingsOverview.savingsWithdrawalsThisMonth
          return {
            ...card,
            value: formatPortfolioMoneyCompact(w.amount),
            note: `${countMajor(w.count)} withdrawals this month`,
          }
        }
        const bucket =
          card.id === "active"
            ? savingsOverview.activeSavingsPlan
            : savingsOverview.inactiveSavingsPlan
        return {
          ...card,
          value: countMajor(bucket.count),
          note: kpiDeltaLabel(bucket, card.fallbackNote),
        }
      }),
    [savingsOverview],
  )

  const investmentKpis = useMemo(
    () =>
      INVESTMENT_KPI_CARDS.map((card) => {
        const bucket =
          card.id === "active"
            ? investmentOverview.activeInvestment
            : investmentOverview.maturedInvestment
        return {
          ...card,
          value: countMajor(bucket.count),
          note: kpiDeltaLabel(bucket, card.fallbackNote),
        }
      }),
    [investmentOverview],
  )

  const commodityKpis = useMemo(
    () =>
      COMMODITY_KPI_CARDS.map((card) => {
        const bucket =
          card.id === "active"
            ? commodityOverview.activeCommodityPlan
            : commodityOverview.completedCommodityPlan
        return {
          ...card,
          value: countMajor(bucket.count),
          note: kpiDeltaLabel(bucket, card.fallbackNote),
        }
      }),
    [commodityOverview],
  )

  function handleLoanKpiClick(next: Exclude<PortfolioStatusFilter, "all">) {
    setPortfolioStatus((prev) => (prev === next ? "all" : next))
  }

  function handleSavingsKpiClick(next: Exclude<SavingsPortfolioStatusFilter, "all">) {
    setPortfolioStatus((prev) => (prev === next ? "all" : next))
  }

  function handleInvestmentKpiClick(next: Exclude<InvestmentPortfolioStatusFilter, "all">) {
    setPortfolioStatus((prev) => (prev === next ? "all" : next))
  }

  function handleCommodityKpiClick(next: Exclude<CommodityPortfolioStatusFilter, "all">) {
    setPortfolioStatus((prev) => (prev === next ? "all" : next))
  }

  function handleTypeChange(next: TabKey) {
    setActiveType(next)
    setPortfolioStatus("all")
  }

  const showSkeleton =
    loading &&
    ((isLoanTab && !loanData) ||
      (isMortgageTab && !mortgageData) ||
      (isSavingsTab && !savingsData) ||
      (isInvestmentTab && !investmentData) ||
      (isCommodityTab && !commodityData))

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

        {error && isPortfolioTab ? (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {isLendingTab && showSkeleton ? (
          <OverviewSkeleton kpiCount={4} />
        ) : isSavingsTab && showSkeleton ? (
          <OverviewSkeleton kpiCount={3} />
        ) : (isInvestmentTab || isCommodityTab) && showSkeleton ? (
          <OverviewSkeleton kpiCount={2} />
        ) : isLoanTab ? (
          <LendingPortfolioOverviewContent
            variant="loan"
            overview={loanOverview}
            kpis={loanKpis}
            portfolioStatus={portfolioStatus as PortfolioStatusFilter}
            loading={loading}
            onKpiClick={handleLoanKpiClick}
            onResetFilter={() => setPortfolioStatus("all")}
          />
        ) : isMortgageTab ? (
          <LendingPortfolioOverviewContent
            variant="mortgage"
            overview={mortgageOverview}
            kpis={mortgageKpis}
            portfolioStatus={portfolioStatus as PortfolioStatusFilter}
            loading={loading}
            onKpiClick={handleLoanKpiClick}
            onResetFilter={() => setPortfolioStatus("all")}
          />
        ) : isSavingsTab ? (
          <SavingsOverviewContent
            overview={savingsOverview}
            kpis={savingsKpis}
            portfolioStatus={portfolioStatus as SavingsPortfolioStatusFilter}
            loading={loading}
            onKpiClick={handleSavingsKpiClick}
            onResetFilter={() => setPortfolioStatus("all")}
          />
        ) : isInvestmentTab ? (
          <InvestmentOverviewContent
            overview={investmentOverview}
            kpis={investmentKpis}
            portfolioStatus={portfolioStatus as InvestmentPortfolioStatusFilter}
            loading={loading}
            onKpiClick={handleInvestmentKpiClick}
            onResetFilter={() => setPortfolioStatus("all")}
          />
        ) : (
          <CommodityOverviewContent
            overview={commodityOverview}
            kpis={commodityKpis}
            portfolioStatus={portfolioStatus as CommodityPortfolioStatusFilter}
            loading={loading}
            onKpiClick={handleCommodityKpiClick}
            onResetFilter={() => setPortfolioStatus("all")}
          />
        )}
      </div>
    </div>
  )
}

function LendingPortfolioOverviewContent({
  variant,
  overview,
  kpis,
  portfolioStatus,
  loading,
  onKpiClick,
  onResetFilter,
}: {
  variant: "loan" | "mortgage"
  overview: ProductOverviewByTypeData
  kpis: { id: string; label: string; note: string; value: string; dotClass: string }[]
  portfolioStatus: PortfolioStatusFilter
  loading: boolean
  onKpiClick: (id: Exclude<PortfolioStatusFilter, "all">) => void
  onResetFilter: () => void
}) {
  const isMortgage = variant === "mortgage"
  const showingLabel = isMortgage
    ? mortgagePortfolioStatusLabel(portfolioStatus)
    : portfolioStatusLabel(portfolioStatus)
  const accountsTitle = isMortgage ? "Mortgages" : "Loans"
  const refColumn = isMortgage ? "Mortgage ref" : "Loan ref"
  const entityPlural = isMortgage ? "mortgages" : "loans"
  const accountsEmptyMessage = isMortgage
    ? "No mortgages match this portfolio filter."
    : "No loans match this portfolio filter."

  const due = overview.repaymentDue

  return (
    <>
      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const selected = portfolioStatus === kpi.id
          return (
            <button
              key={kpi.id}
              type="button"
              data-filter={kpi.id}
              onClick={() => onKpiClick(kpi.id as Exclude<PortfolioStatusFilter, "all">)}
              aria-pressed={Boolean(selected)}
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
                `${countMajor(due.repaymentCount)} repayments across ${countMajor(due.activeLoanCount ?? overview.activeLoan.count)} active ${entityPlural}`}
            </p>
          </div>
          <span className="text-xl font-bold text-[#14171F]">
            {formatPortfolioMoneyCompact(due.amount)}
          </span>
        </div>
      ) : null}

      <section className={cn(PANEL, "mb-5 px-[22px] py-5", loading && "opacity-70")}>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-bold text-[#14171F]">{accountsTitle}</p>
          <div className="flex items-center gap-2.5 text-xs text-[#6B7280]">
            <span>
              Showing: <strong className="font-bold text-[#96723F]">{showingLabel}</strong>
            </span>
            <button
              type="button"
              onClick={onResetFilter}
              className="rounded-full bg-[#EEEEEC] px-3 py-1 text-[11px] font-bold text-[#6B6B66]"
            >
              View all
            </button>
          </div>
        </div>

        {loading && overview.loanAccounts.length === 0 ? (
          <TableSkeleton columnCount={5} rowCount={5} />
        ) : (
          <PortfolioTable
            columns={[refColumn, "Customer", "Principal", "Status", "Disbursed"]}
            numericColumnIndex={2}
            emptyMessage={accountsEmptyMessage}
            rows={overview.loanAccounts.map((row, index) => {
              const status = row.portfolioStatus || row.status || "—"
              return [
                row.loanRef || "—",
                row.customerName || "—",
                formatPortfolioMoney(row.principal),
                <StatusBadge
                  key={`status-${index}`}
                  label={titleCaseStatus(status)}
                  tone={portfolioAccountStatusTone(status)}
                />,
                formatOverviewDate(row.disbursedAt),
              ]
            })}
          />
        )}
      </section>

      <section className={`${PANEL} mb-5 px-[22px] py-5`}>
        <PanelHeader title="Repayments" countLabel={`Last ${Math.min(5, overview.repayments.length) || 5}`} />
        <PortfolioTable
          columns={[refColumn, "Customer", "Amount", "Date", "Status"]}
          numericColumnIndex={2}
          emptyMessage="No recent repayments."
          rows={overview.repayments.slice(0, 5).map((row, index) => [
            row.loanRef || "—",
            row.customerName || "—",
            formatPortfolioMoney(row.amount),
            formatOverviewDate(row.date),
            <StatusBadge
              key={`repay-status-${index}`}
              label={titleCaseStatus(row.status || "Success")}
              tone={portfolioAccountStatusTone(row.status || "success")}
            />,
          ])}
        />
      </section>

      <section className={`${PANEL} px-[22px] py-5`}>
        <PanelHeader
          title="Failed repayment"
          countLabel={`Last ${Math.min(5, overview.failedRepayments.length) || 5}`}
        />
        <PortfolioTable
          columns={[refColumn, "Customer", "Amount", "Date", "Reason"]}
          numericColumnIndex={2}
          emptyMessage="No failed repayments."
          rows={overview.failedRepayments.slice(0, 5).map((row, index) => [
            row.loanRef || "—",
            row.customerName || "—",
            formatPortfolioMoney(row.amount),
            formatOverviewDate(row.date),
            <StatusBadge
              key={`failed-${index}`}
              label={titleCaseStatus(row.reason || row.status || "Failed")}
              tone="danger"
            />,
          ])}
        />
      </section>
    </>
  )
}

function SavingsOverviewContent({
  overview,
  kpis,
  portfolioStatus,
  loading,
  onKpiClick,
  onResetFilter,
}: {
  overview: ProductOverviewSavingsData
  kpis: {
    id?: string
    label: string
    note: string
    value: string
    dotClass: string
    filterable: boolean
  }[]
  portfolioStatus: SavingsPortfolioStatusFilter
  loading: boolean
  onKpiClick: (id: Exclude<SavingsPortfolioStatusFilter, "all">) => void
  onResetFilter: () => void
}) {
  const showingLabel = savingsPortfolioStatusLabel(portfolioStatus)
  const pendingCount = overview.pendingWithdrawal.count || overview.withdrawalRequests.length

  return (
    <>
      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => {
          const selected = kpi.filterable && kpi.id && portfolioStatus === kpi.id
          const inner = (
            <>
              <span className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
                <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", kpi.dotClass)} />
                {kpi.label}
              </span>
              <span className="mt-2.5 block text-2xl font-bold leading-none text-[#14171F]">
                {kpi.value}
              </span>
              <span className="mt-1.5 block text-xs text-[#9A9A94]">{kpi.note}</span>
            </>
          )

          if (!kpi.filterable || !kpi.id) {
            return (
              <div key={kpi.label} className="rounded-[14px] border border-[#E7E5E0] bg-white px-[18px] py-4">
                {inner}
              </div>
            )
          }

          return (
            <button
              key={kpi.id}
              type="button"
              data-filter={kpi.id}
              onClick={() => onKpiClick(kpi.id as Exclude<SavingsPortfolioStatusFilter, "all">)}
              aria-pressed={Boolean(selected)}
              className={cn(
                "rounded-[14px] border px-[18px] py-4 text-left transition-colors",
                selected
                  ? "border-[#B08D57] bg-[#F7EEDD]"
                  : "border-[#E7E5E0] bg-white hover:border-[#B08D57]",
              )}
            >
              {inner}
            </button>
          )
        })}
      </div>

      <section className={cn(PANEL, "mb-5 px-[22px] py-5", loading && "opacity-70")}>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-bold text-[#14171F]">Savings accounts</p>
          <div className="flex items-center gap-2.5 text-xs text-[#6B7280]">
            <span>
              Showing: <strong className="font-bold text-[#96723F]">{showingLabel}</strong>
            </span>
            <button
              type="button"
              onClick={onResetFilter}
              className="rounded-full bg-[#EEEEEC] px-3 py-1 text-[11px] font-bold text-[#6B6B66]"
            >
              View all
            </button>
          </div>
        </div>

        {loading && overview.savingsAccounts.length === 0 ? (
          <TableSkeleton columnCount={5} rowCount={5} />
        ) : (
          <PortfolioTable
            columns={["Account ref", "Customer", "Balance", "Status", "Opened"]}
            numericColumnIndex={2}
            emptyMessage="No savings accounts match this filter."
            rows={overview.savingsAccounts.map((row, index) => [
              row.reference || "—",
              row.customerName || "—",
              formatPortfolioMoney(row.balance),
              <StatusBadge
                key={`sav-status-${index}`}
                label={savingsAccountStatusLabel(row.status)}
                tone={savingsAccountStatusTone(row.status)}
              />,
              formatOverviewDate(row.openedAt),
            ])}
          />
        )}
      </section>

      <section className={`${PANEL} mb-5 px-[22px] py-5`}>
        <PanelHeader
          title="Savings activities"
          countLabel={`Last ${Math.min(5, overview.recentContributions.length) || 5}`}
        />
        <PortfolioTable
          columns={["Customer", "Activity", "Amount", "Date"]}
          numericColumnIndex={2}
          emptyMessage="No recent savings activity."
          rows={overview.recentContributions.slice(0, 5).map((row, index) => [
            row.customerName || "—",
            <ActivityPill key={`act-${index}`} label={formatSavingsActivity(row.activity)} />,
            formatPortfolioMoney(row.amount),
            formatOverviewDate(row.date),
          ])}
        />
      </section>

      <section className={`${PANEL} mb-5 px-[22px] py-5`}>
        <PanelHeader title="Withdrawal request" countLabel={`Pending (${countMajor(pendingCount)})`} />
        <PortfolioTable
          columns={["Customer", "Amount", "Requested", "Action"]}
          numericColumnIndex={1}
          actionColumn
          emptyMessage="No pending withdrawal requests."
          rows={overview.withdrawalRequests.map((row, index) => [
            row.customerName || "—",
            formatPortfolioMoney(row.amount),
            formatOverviewDate(row.requestedOn),
            <div key={`wd-act-${index}`} className="text-right">
              <button
                type="button"
                disabled
                title="Approval workflow coming soon"
                className="mr-1.5 rounded-lg bg-[#B08D57] px-3.5 py-1.5 text-xs font-bold text-white opacity-60 cursor-not-allowed"
              >
                Approve
              </button>
              <button
                type="button"
                disabled
                title="Approval workflow coming soon"
                className="rounded-lg border border-[#E7E5E0] bg-white px-3.5 py-1.5 text-xs font-bold text-[#6B7280] opacity-60 cursor-not-allowed"
              >
                Decline
              </button>
            </div>,
          ])}
        />
      </section>

      <section className={`${PANEL} px-[22px] py-5`}>
        <PanelHeader title="Approved withdrawal" countLabel="Last 5" />
        <p className="mb-3 text-xs text-[#9A9A94]">
          Paid-out withdrawals are not returned by the API yet — this section will populate when
          approved withdrawals are available.
        </p>
        <PortfolioTable
          columns={["Customer", "Amount", "Approved", "Status"]}
          numericColumnIndex={1}
          emptyMessage="No approved withdrawals yet."
          rows={[]}
        />
      </section>
    </>
  )
}

function InvestmentOverviewContent({
  overview,
  kpis,
  portfolioStatus,
  loading,
  onKpiClick,
  onResetFilter,
}: {
  overview: ProductOverviewInvestmentData
  kpis: { id: string; label: string; note: string; value: string; dotClass: string }[]
  portfolioStatus: InvestmentPortfolioStatusFilter
  loading: boolean
  onKpiClick: (id: Exclude<InvestmentPortfolioStatusFilter, "all">) => void
  onResetFilter: () => void
}) {
  const showingLabel = investmentPortfolioStatusLabel(portfolioStatus)
  const pendingCount = overview.pendingLiquidation.count || overview.liquidationRequests.length

  return (
    <>
      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {kpis.map((kpi) => {
          const selected = portfolioStatus === kpi.id
          return (
            <button
              key={kpi.id}
              type="button"
              data-filter={kpi.id}
              onClick={() => onKpiClick(kpi.id as Exclude<InvestmentPortfolioStatusFilter, "all">)}
              aria-pressed={Boolean(selected)}
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

      <section className={cn(PANEL, "mb-5 px-[22px] py-5", loading && "opacity-70")}>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-bold text-[#14171F]">Investments</p>
          <div className="flex items-center gap-2.5 text-xs text-[#6B7280]">
            <span>
              Showing: <strong className="font-bold text-[#96723F]">{showingLabel}</strong>
            </span>
            <button
              type="button"
              onClick={onResetFilter}
              className="rounded-full bg-[#EEEEEC] px-3 py-1 text-[11px] font-bold text-[#6B6B66]"
            >
              View all
            </button>
          </div>
        </div>

        {loading && overview.investmentAccounts.length === 0 ? (
          <TableSkeleton columnCount={5} rowCount={5} />
        ) : (
          <PortfolioTable
            columns={["Investment ref", "Customer", "Amount", "Status", "Started"]}
            numericColumnIndex={2}
            emptyMessage="No investments match this filter."
            rows={overview.investmentAccounts.map((row, index) => [
              row.reference || "—",
              row.customerName || "—",
              formatPortfolioMoney(row.amount),
              <StatusBadge
                key={`inv-status-${index}`}
                label={savingsAccountStatusLabel(row.status)}
                tone={savingsAccountStatusTone(row.status)}
              />,
              formatOverviewDate(row.startedAt),
            ])}
          />
        )}
      </section>

      <section className={`${PANEL} mb-5 px-[22px] py-5`}>
        <PanelHeader
          title="Investment activities"
          countLabel="New investment · top-up · last 5"
        />
        <PortfolioTable
          columns={["Customer", "Activity", "Amount", "Date"]}
          numericColumnIndex={2}
          emptyMessage="No recent investment activity."
          rows={overview.recentActivity.slice(0, 5).map((row, index) => [
            row.customerName || "—",
            <ActivityPill key={`inv-act-${index}`} label={formatInvestmentActivity(row.activity)} />,
            formatPortfolioMoney(row.amount),
            formatOverviewDate(row.date),
          ])}
        />
      </section>

      <section className={`${PANEL} mb-5 px-[22px] py-5`}>
        <PanelHeader title="Liquidation request" countLabel={`Pending (${countMajor(pendingCount)})`} />
        <PortfolioTable
          columns={["Customer", "Amount", "Requested", "Action"]}
          numericColumnIndex={1}
          actionColumn
          emptyMessage="No pending liquidation requests."
          rows={overview.liquidationRequests.map((row, index) => [
            row.customerName || "—",
            formatPortfolioMoney(row.amount),
            formatOverviewDate(row.requestedOn),
            <div key={`liq-act-${index}`} className="text-right">
              <button
                type="button"
                disabled
                title="Approval workflow coming soon"
                className="mr-1.5 rounded-lg bg-[#B08D57] px-3.5 py-1.5 text-xs font-bold text-white opacity-60 cursor-not-allowed"
              >
                Approve
              </button>
              <button
                type="button"
                disabled
                title="Approval workflow coming soon"
                className="rounded-lg border border-[#E7E5E0] bg-white px-3.5 py-1.5 text-xs font-bold text-[#6B7280] opacity-60 cursor-not-allowed"
              >
                Decline
              </button>
            </div>,
          ])}
        />
      </section>

      <section className={`${PANEL} px-[22px] py-5`}>
        <PanelHeader
          title="Liquidation"
          countLabel={`Last ${Math.min(5, overview.approvedLiquidations.length) || 5}`}
        />
        <PortfolioTable
          columns={["Customer", "Amount", "Settled", "Status"]}
          numericColumnIndex={1}
          emptyMessage="No liquidations yet."
          rows={overview.approvedLiquidations.slice(0, 5).map((row, index) => [
            row.customerName || "—",
            formatPortfolioMoney(row.amount),
            formatOverviewDate(row.settledOn),
            <StatusBadge
              key={`liq-status-${index}`}
              label={liquidationStatusLabel(row.status)}
              tone={liquidationStatusTone(row.status)}
            />,
          ])}
        />
      </section>
    </>
  )
}

function CustomerCell({ name, subtitle }: { name?: string; subtitle?: string }) {
  return (
    <div>
      <div>{name || "—"}</div>
      {subtitle ? <div className="mt-0.5 text-xs text-[#9A9A94]">{subtitle}</div> : null}
    </div>
  )
}

function CommodityOverviewContent({
  overview,
  kpis,
  portfolioStatus,
  loading,
  onKpiClick,
  onResetFilter,
}: {
  overview: ProductOverviewCommodityData
  kpis: { id: string; label: string; note: string; value: string; dotClass: string }[]
  portfolioStatus: CommodityPortfolioStatusFilter
  loading: boolean
  onKpiClick: (id: Exclude<CommodityPortfolioStatusFilter, "all">) => void
  onResetFilter: () => void
}) {
  const showingLabel = commodityPortfolioStatusLabel(portfolioStatus)
  const pendingCount = overview.pendingLiquidation.count || overview.liquidationRequests.length

  return (
    <>
      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {kpis.map((kpi) => {
          const selected = portfolioStatus === kpi.id
          return (
            <button
              key={kpi.id}
              type="button"
              data-filter={kpi.id}
              onClick={() => onKpiClick(kpi.id as Exclude<CommodityPortfolioStatusFilter, "all">)}
              aria-pressed={Boolean(selected)}
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

      <section className={cn(PANEL, "mb-5 px-[22px] py-5", loading && "opacity-70")}>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-bold text-[#14171F]">Commodities</p>
          <div className="flex items-center gap-2.5 text-xs text-[#6B7280]">
            <span>
              Showing: <strong className="font-bold text-[#96723F]">{showingLabel}</strong>
            </span>
            <button
              type="button"
              onClick={onResetFilter}
              className="rounded-full bg-[#EEEEEC] px-3 py-1 text-[11px] font-bold text-[#6B6B66]"
            >
              View all
            </button>
          </div>
        </div>

        {loading && overview.commodityAccounts.length === 0 ? (
          <TableSkeleton columnCount={5} rowCount={5} />
        ) : (
          <PortfolioTable
            columns={["Commodity ref", "Customer", "Amount", "Status", "Started"]}
            numericColumnIndex={2}
            emptyMessage="No commodities match this filter."
            rows={overview.commodityAccounts.map((row, index) => [
              row.reference || "—",
              <CustomerCell
                key={`cmd-cust-${index}`}
                name={row.customerName}
                subtitle={row.commodity}
              />,
              formatPortfolioMoney(row.amount),
              <StatusBadge
                key={`cmd-status-${index}`}
                label={savingsAccountStatusLabel(row.status)}
                tone={savingsAccountStatusTone(row.status)}
              />,
              formatOverviewDate(row.startedAt),
            ])}
          />
        )}
      </section>

      <section className={`${PANEL} mb-5 px-[22px] py-5`}>
        <PanelHeader
          title="Commodity activities"
          countLabel="New investment · top-up · last 5"
        />
        <PortfolioTable
          columns={["Customer", "Activity", "Amount", "Date"]}
          numericColumnIndex={2}
          emptyMessage="No recent commodity activity."
          rows={overview.recentActivity.slice(0, 5).map((row, index) => [
            <CustomerCell
              key={`cmd-act-cust-${index}`}
              name={row.customerName}
              subtitle={row.commodity}
            />,
            <ActivityPill key={`cmd-act-${index}`} label={formatInvestmentActivity(row.activity)} />,
            formatPortfolioMoney(row.amount),
            formatOverviewDate(row.date),
          ])}
        />
      </section>

      <section className={`${PANEL} mb-5 px-[22px] py-5`}>
        <PanelHeader title="Liquidation request" countLabel={`Pending (${countMajor(pendingCount)})`} />
        <PortfolioTable
          columns={["Customer", "Amount", "Requested", "Action"]}
          numericColumnIndex={1}
          actionColumn
          emptyMessage="No pending liquidation requests."
          rows={overview.liquidationRequests.map((row, index) => [
            row.customerName || "—",
            formatPortfolioMoney(row.amount),
            formatOverviewDate(row.requestedOn),
            <div key={`cmd-liq-act-${index}`} className="text-right">
              <button
                type="button"
                disabled
                title="Approval workflow coming soon"
                className="mr-1.5 rounded-lg bg-[#B08D57] px-3.5 py-1.5 text-xs font-bold text-white opacity-60 cursor-not-allowed"
              >
                Approve
              </button>
              <button
                type="button"
                disabled
                title="Approval workflow coming soon"
                className="rounded-lg border border-[#E7E5E0] bg-white px-3.5 py-1.5 text-xs font-bold text-[#6B7280] opacity-60 cursor-not-allowed"
              >
                Decline
              </button>
            </div>,
          ])}
        />
      </section>

      <section className={`${PANEL} px-[22px] py-5`}>
        <PanelHeader
          title="Liquidation"
          countLabel={`Last ${Math.min(5, overview.approvedLiquidations.length) || 5}`}
        />
        <PortfolioTable
          columns={["Customer", "Amount", "Settled", "Status"]}
          numericColumnIndex={1}
          emptyMessage="No liquidations yet."
          rows={overview.approvedLiquidations.slice(0, 5).map((row, index) => [
            row.customerName || "—",
            formatPortfolioMoney(row.amount),
            formatOverviewDate(row.settledOn),
            <StatusBadge
              key={`cmd-liq-status-${index}`}
              label={liquidationStatusLabel(row.status)}
              tone={liquidationStatusTone(row.status)}
            />,
          ])}
        />
      </section>
    </>
  )
}

function PanelHeader({ title, countLabel }: { title: string; countLabel: string }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-2">
      <p className="text-[15px] font-bold text-[#14171F]">{title}</p>
      <span className="text-xs text-[#9A9A94]">{countLabel}</span>
    </div>
  )
}

function PortfolioTable({
  columns,
  rows,
  numericColumnIndex,
  actionColumn,
  emptyMessage,
}: {
  columns: string[]
  rows: (string | ReactNode)[][]
  numericColumnIndex?: number
  actionColumn?: boolean
  emptyMessage: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr>
            {columns.map((label, i) => (
              <th
                key={label}
                className={cn(
                  "border-b border-[#E7E5E0] pb-2.5 text-[11px] font-bold uppercase tracking-[0.02em] text-[#9A9A94]",
                  i === numericColumnIndex || (actionColumn && i === columns.length - 1)
                    ? "px-3 text-right"
                    : "px-3 text-left",
                )}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex}>
              {cells.map((cell, colIndex) => (
                <td
                  key={colIndex}
                  className={cn(
                    "border-b border-[#E7E5E0] px-3 py-[13px] text-[#14171F]",
                    colIndex === numericColumnIndex || (actionColumn && colIndex === cells.length - 1)
                      ? "text-right"
                      : undefined,
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-[#9A9A94]">
                {emptyMessage}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
