/**
 * Product Overview API types + mappers (Plata).
 * GET /api/v1/products/app/{appId}/product-overview
 * GET /api/v1/products/app/{appId}/product-overview/by-type/{productType}
 */

export type ProductOverviewTabKey = "loan" | "mortgage" | "savings" | "investment" | "commodity"

export type ProductOverviewApiType = "LOAN" | "MORTGAGE" | "SAVINGS" | "INVESTMENT" | "COMMODITY"

export type OverviewTone = "success" | "muted" | "warning" | "danger" | "gold" | "info"

export type OverviewCell = string | { badge: string; tone: OverviewTone }

export type OverviewTable = {
  id: string
  title: string
  description?: string
  columns: { label: string; align?: "right" }[]
  rows: OverviewCell[][]
}

/** Query value for by-type LOAN / MORTGAGE portfolio filters. */
export type PortfolioStatusParam = "all" | "active" | "inactive" | "non_performing" | "bad"

export type OverviewKpi = {
  id: string
  label: string
  value: string
  note: string
  tone: OverviewTone
  drilldown?: OverviewTable
  special?: "mortgage-savings"
  /** When set, KPI card click refetches by-type with this portfolioStatus. */
  portfolioStatus?: Exclude<PortfolioStatusParam, "all">
}

export type OverviewDue = { label: string; note: string; amount: number }

export type OverviewRequestRow = {
  id: string
  reference: string
  customer: string
  detail: string
  amount: number
  requestedOn: string
  status: "pending" | "approved" | "declined"
}

export type OverviewByTypeView = {
  kpis: OverviewKpi[]
  due?: OverviewDue
  tables: OverviewTable[]
  requests: OverviewRequestRow[]
  mortgageSavingsPending?: number
  mortgageSavingsRunning?: number
  portfolioAccountsMeta?: PortfolioAccountsMeta
}

export type CategoryRow = {
  type: string
  configuredProductCount: number
  applicationCount: number
  customerCount: number
  capitalAmount: number
  issuedAmount: number
  repaymentAmount: number
  inventoryAmount: number
  salesAmount: number
}

export type ProductOverviewHeadline = {
  requestedAmount?: number
  approvedAmount?: number
  lendingApplicationsRequestedCount?: number
  lendingApplicationsApprovedCount?: number
  totalTransactions?: number
  totalSavings?: number
  totalInterest?: number
}

export type ProductOverviewData = {
  schemaVersion?: number
  generatedAt?: string
  appId?: string
  headline?: ProductOverviewHeadline
  byCategory?: CategoryRow[]
}

export type OverviewProductRow = {
  productId?: string
  referenceNumber?: string
  name?: string
  customerCount?: number
  applicationCount?: number
  capitalAmount?: number
  issuedAmount?: number
  repaymentAmount?: number
  inventoryAmount?: number
  salesAmount?: number
}

type CountDelta = {
  count?: number
  deltaThisMonth?: number
  principalTotal?: number
  outstandingTotal?: number
}
type PortfolioBucket = {
  count?: number
  deltaThisMonth?: number
  principalTotal?: number
  outstandingTotal?: number
}
type WeekDue = {
  amount?: number
  scheduledCount?: number
  weekStart?: string
  weekEnd?: string
}

export type PortfolioAccountRow = {
  id?: string
  reference?: string
  customerName?: string
  productId?: string
  productName?: string
  principal?: number
  outstanding?: number
  daysOverdue?: number
  status?: string
  disbursedAt?: string | null
  maturedAt?: string | null
}

export type PortfolioAccountsMeta = {
  portfolioStatus?: string
  total?: number
  limit?: number
  skip?: number
  hasMore?: boolean
}

type RepaymentRow = {
  reference?: string
  customerName?: string
  amount?: number
  receivedOn?: string
  attemptedOn?: string
  reason?: string
  status?: string
}

type SavingsContribution = {
  reference?: string
  customerName?: string
  plan?: string
  amount?: number
  receivedOn?: string
  status?: string
}

type SavingsWithdrawal = {
  reference?: string
  customerName?: string
  plan?: string
  amount?: number
  requestedOn?: string
  status?: string
}

type ActivityRow = {
  reference?: string
  customerName?: string
  activity?: string
  instrument?: string
  commodity?: string
  amount?: number
  date?: string
  requestedOn?: string
  status?: string
}

export type ByTypeOverviewData = {
  schemaVersion?: number
  generatedAt?: string
  appId?: string
  type?: string
  products?: OverviewProductRow[]
  loanAccounts?: PortfolioAccountRow[]
  mortgageAccounts?: PortfolioAccountRow[]
  portfolioAccountsMeta?: PortfolioAccountsMeta
  totals?: {
    distinctCustomerCount?: number
    applicationCount?: number
    capitalAmount?: number
    issuedAmount?: number
    repaymentAmount?: number
    inventoryAmount?: number
    salesAmount?: number
  }
  loanPortfolio?: {
    statusDefinitions?: Record<string, string>
    activeLoan?: CountDelta
    inactiveLoan?: PortfolioBucket
    nonPerformingLoan?: PortfolioBucket
    badLoan?: PortfolioBucket
    repaymentsDueThisWeek?: WeekDue
    recentRepayments?: RepaymentRow[]
    failedRepayments?: RepaymentRow[]
  }
  mortgagePortfolio?: {
    statusDefinitions?: Record<string, string>
    activeMortgage?: CountDelta
    inactiveMortgage?: PortfolioBucket
    nonPerformingMortgage?: PortfolioBucket
    badMortgage?: PortfolioBucket
    mortgageSavings?: { count?: number; pendingReview?: number; running?: number }
    repaymentsDueThisWeek?: WeekDue
    recentRepayments?: RepaymentRow[]
    failedRepayments?: RepaymentRow[]
  }
  savingsPortfolio?: {
    activeSavingsPlan?: CountDelta
    inactiveSavingsPlan?: { count?: number }
    missedContribution?: { count?: number }
    pendingWithdrawal?: { count?: number }
    contributionsDueThisWeek?: WeekDue
    recentContributions?: SavingsContribution[]
    withdrawalRequests?: SavingsWithdrawal[]
  }
  investmentPortfolio?: {
    activeInvestment?: CountDelta
    maturedInvestment?: { count?: number }
    underperformingInvestment?: { count?: number }
    pendingLiquidation?: { count?: number }
    maturityDueThisWeek?: WeekDue
    recentActivity?: ActivityRow[]
    liquidationRequests?: ActivityRow[]
  }
  commodityPortfolio?: {
    activeCommodityPlan?: CountDelta
    completedCommodityPlan?: { count?: number }
    delayedDelivery?: { count?: number }
    pendingLiquidation?: { count?: number }
    deliveryDueThisWeek?: WeekDue
    recentActivity?: ActivityRow[]
    liquidationRequests?: ActivityRow[]
  }
}

export function tabKeyToApiType(key: ProductOverviewTabKey): ProductOverviewApiType {
  return key.toUpperCase() as ProductOverviewApiType
}

/** Unwrap `{ data }` envelopes from the gateway, or return the payload itself. */
export function unwrapApiData<T>(res: unknown): T | null {
  if (!res || typeof res !== "object") return null
  const obj = res as Record<string, unknown>
  if ("data" in obj) {
    const inner = obj.data
    if (inner == null) return null
    return inner as T
  }
  return obj as T
}

export function moneyMajor(value: number | undefined | null) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0
  return `₦${n.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function countMajor(value: number | undefined | null) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0
  return n.toLocaleString("en-NG")
}

function formatDate(iso?: string | null) {
  if (!iso || typeof iso !== "string") return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function statusTone(status?: string): OverviewTone {
  const s = String(status || "").toLowerCase()
  if (s.includes("success") || s === "approved" || s === "active") return "success"
  if (s.includes("fail") || s === "declined" || s === "rejected") return "danger"
  if (s.includes("pending") || s.includes("warn")) return "warning"
  return "muted"
}

function col(label: string, align?: "right"): { label: string; align?: "right" } {
  return align ? { label, align } : { label }
}

/** Drop null tables; keep products/accounts even when empty. */
function keepOverviewTable(t: OverviewTable | null | undefined): t is OverviewTable {
  if (!t) return false
  return t.rows.length > 0 || t.id.endsWith("-products") || t.id.endsWith("-accounts")
}

function titleCaseStatus(status?: string) {
  const s = String(status || "—").trim()
  if (!s) return "—"
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function requestStatus(status?: string): OverviewRequestRow["status"] {
  const s = String(status || "").toLowerCase()
  if (s === "approved") return "approved"
  if (s === "declined" || s === "rejected") return "declined"
  return "pending"
}

function productsTable(products: OverviewProductRow[] | undefined, type: ProductOverviewApiType): OverviewTable {
  const isCommodity = type === "COMMODITY"
  const isSavingsLike = type === "SAVINGS" || type === "INVESTMENT"
  return {
    id: `${type.toLowerCase()}-products`,
    title: "Configured products",
    description: "Products of this type on the app.",
    columns: [
      col("Product"),
      col("Reference"),
      col("Customers", "right"),
      col("Applications", "right"),
      col(isCommodity ? "Inventory" : isSavingsLike ? "Balance / deposits" : "Requested", "right"),
      col(isCommodity ? "Sales" : isSavingsLike ? "Interest" : "Approved / issued", "right"),
    ],
    rows: (products ?? []).map((p) => [
      p.name?.trim() || "—",
      p.referenceNumber?.trim() || p.productId || "—",
      countMajor(p.customerCount),
      countMajor(p.applicationCount),
      moneyMajor(isCommodity ? p.inventoryAmount : p.capitalAmount),
      moneyMajor(isCommodity ? p.salesAmount : p.issuedAmount),
    ]),
  }
}

function mapRepaymentRows(rows: RepaymentRow[] | undefined, failed: boolean): OverviewCell[][] {
  return (rows ?? []).map((r) => {
    const base: OverviewCell[] = [
      r.reference || "—",
      r.customerName || "—",
      moneyMajor(r.amount),
      formatDate(failed ? r.attemptedOn : r.receivedOn),
    ]
    if (failed) base.push(r.reason || "—")
    base.push({ badge: titleCaseStatus(r.status || (failed ? "Failed" : "Successful")), tone: statusTone(r.status || (failed ? "failed" : "successful")) })
    return base
  })
}

function portfolioStatusTone(status?: string): OverviewTone {
  const s = String(status || "").toLowerCase().replace(/-/g, "_")
  if (s === "active") return "success"
  if (s === "inactive") return "muted"
  if (s === "non_performing" || s === "nonperforming") return "warning"
  if (s === "bad") return "danger"
  return statusTone(status)
}

/** KPI subtitle: outstanding (or principal) only — ignore long statusDefinitions writeups. */
function portfolioBucketNote(bucket: PortfolioBucket | CountDelta | undefined): string {
  if (bucket?.outstandingTotal != null && Number.isFinite(bucket.outstandingTotal)) {
    return `${moneyMajor(bucket.outstandingTotal)} outstanding`
  }
  if (bucket?.principalTotal != null && Number.isFinite(bucket.principalTotal)) {
    return `${moneyMajor(bucket.principalTotal)} principal`
  }
  return "₦0.00 outstanding"
}

function portfolioAccountsTable(data: ByTypeOverviewData | null | undefined): OverviewTable | null {
  const type = String(data?.type || "").toUpperCase()
  if (type !== "LOAN" && type !== "MORTGAGE") return null

  // Always render the accounts table for lending types (empty list is valid).
  const accounts =
    (type === "LOAN" ? data?.loanAccounts : data?.mortgageAccounts) ?? []

  const meta = data?.portfolioAccountsMeta
  const rawStatus = String(meta?.portfolioStatus || "all").toLowerCase()
  const statusLabel = rawStatus === "all" ? "all" : rawStatus.replace(/_/g, " ")
  const total = meta?.total ?? accounts.length
  const noun = type === "MORTGAGE" ? "mortgage" : "loan"
  const description =
    `${countMajor(total)} ${statusLabel === "all" ? "" : `${statusLabel} `}${noun} account${total === 1 ? "" : "s"}`.trim()

  return {
    id: `${noun}-accounts`,
    title: `${type === "MORTGAGE" ? "Mortgage" : "Loan"} accounts`,
    description,
    columns: [
      col("Reference"),
      col("Customer"),
      col("Product"),
      col("Principal", "right"),
      col("Outstanding", "right"),
      col("Days overdue", "right"),
      col("Status"),
      col("Disbursed"),
      col("Matured"),
    ],
    rows: accounts.map((a) => [
      a.reference?.trim() || a.id || "—",
      a.customerName?.trim() || "—",
      a.productName?.trim() || a.productId || "—",
      moneyMajor(a.principal),
      moneyMajor(a.outstanding),
      countMajor(a.daysOverdue),
      {
        badge: titleCaseStatus(String(a.status || "—").replace(/_/g, " ")),
        tone: portfolioStatusTone(a.status),
      },
      formatDate(a.disbursedAt),
      formatDate(a.maturedAt),
    ]),
  }
}

/** Map only the filterable accounts table + meta from a by-type payload. */
export function mapPortfolioAccountsFromData(data: ByTypeOverviewData | null | undefined): {
  table: OverviewTable | null
  meta?: PortfolioAccountsMeta
} {
  return {
    table: portfolioAccountsTable(data),
    meta: data?.portfolioAccountsMeta,
  }
}

/** Replace or prepend the portfolio accounts table while keeping other tables. */
export function withPortfolioAccountsTable(
  base: OverviewByTypeView,
  accountsTable: OverviewTable | null | undefined,
  meta?: PortfolioAccountsMeta | null,
): OverviewByTypeView {
  const withoutAccounts = base.tables.filter((t) => !t.id.endsWith("-accounts"))
  return {
    ...base,
    portfolioAccountsMeta: meta ?? base.portfolioAccountsMeta,
    tables: accountsTable ? [accountsTable, ...withoutAccounts] : withoutAccounts,
  }
}

/** Append more account rows (pagination). */
export function appendPortfolioAccountRows(
  view: OverviewByTypeView,
  nextAccountsTable: OverviewTable,
  meta?: PortfolioAccountsMeta | null,
): OverviewByTypeView {
  const existing = view.tables.find((t) => t.id.endsWith("-accounts"))
  const merged: OverviewTable = existing
    ? {
        ...nextAccountsTable,
        rows: [...existing.rows, ...nextAccountsTable.rows],
        description: nextAccountsTable.description || existing.description,
      }
    : nextAccountsTable
  return withPortfolioAccountsTable(view, merged, meta)
}

export function mapByTypeToView(data: ByTypeOverviewData | null | undefined): OverviewByTypeView {
  const type = String(data?.type || "LOAN").toUpperCase() as ProductOverviewApiType
  const productTable = productsTable(data?.products, type)
  const accountsTable = portfolioAccountsTable(data)
  const empty: OverviewByTypeView = {
    kpis: [],
    tables: [accountsTable, productTable].filter(Boolean) as OverviewTable[],
    requests: [],
  }

  if (type === "LOAN" && data?.loanPortfolio) {
    const p = data.loanPortfolio
    const due = p.repaymentsDueThisWeek
    return {
      kpis: [
        {
          id: "loan-active",
          label: "Active loan",
          value: countMajor(p.activeLoan?.count),
          note: portfolioBucketNote(p.activeLoan),
          tone: "success",
          portfolioStatus: "active",
        },
        {
          id: "loan-inactive",
          label: "Inactive loan",
          value: countMajor(p.inactiveLoan?.count),
          note: portfolioBucketNote(p.inactiveLoan),
          tone: "muted",
          portfolioStatus: "inactive",
        },
        {
          id: "loan-non-performing",
          label: "Non-performing loan",
          value: countMajor(p.nonPerformingLoan?.count),
          note: portfolioBucketNote(p.nonPerformingLoan),
          tone: "warning",
          portfolioStatus: "non_performing",
        },
        {
          id: "loan-bad",
          label: "Bad loan",
          value: countMajor(p.badLoan?.count),
          note: portfolioBucketNote(p.badLoan),
          tone: "danger",
          portfolioStatus: "bad",
        },
      ],
      due: due
        ? {
            label: "Repayment due this week",
            note: `${countMajor(due.scheduledCount)} repayments scheduled across active accounts`,
            amount: due.amount ?? 0,
          }
        : undefined,
      tables: [
        accountsTable,
        productTable,
        {
          id: "loan-repayments",
          title: "Repayments",
          description: "Recent repayments received.",
          columns: [
            col("Reference"),
            col("Customer"),
            col("Amount", "right"),
            col("Received on"),
            col("Status"),
          ],
          rows: mapRepaymentRows(p.recentRepayments, false),
        },
        {
          id: "loan-failed-repayments",
          title: "Failed repayment",
          description: "Recent repayment attempts that did not go through.",
          columns: [
            col("Reference"),
            col("Customer"),
            col("Amount", "right"),
            col("Attempted on"),
            col("Reason"),
            col("Status"),
          ],
          rows: mapRepaymentRows(p.failedRepayments, true),
        },
      ].filter(keepOverviewTable),
      requests: [],
      portfolioAccountsMeta: data.portfolioAccountsMeta,
    }
  }

  if (type === "MORTGAGE" && data?.mortgagePortfolio) {
    const p = data.mortgagePortfolio
    const due = p.repaymentsDueThisWeek
    const ms = p.mortgageSavings
    return {
      kpis: [
        {
          id: "mortgage-active",
          label: "Active mortgage",
          value: countMajor(p.activeMortgage?.count),
          note: portfolioBucketNote(p.activeMortgage),
          tone: "success",
          portfolioStatus: "active",
        },
        {
          id: "mortgage-inactive",
          label: "Inactive mortgage",
          value: countMajor(p.inactiveMortgage?.count),
          note: portfolioBucketNote(p.inactiveMortgage),
          tone: "muted",
          portfolioStatus: "inactive",
        },
        {
          id: "mortgage-non-performing",
          label: "Non-performing mortgage",
          value: countMajor(p.nonPerformingMortgage?.count),
          note: portfolioBucketNote(p.nonPerformingMortgage),
          tone: "warning",
          portfolioStatus: "non_performing",
        },
        {
          id: "mortgage-bad",
          label: "Bad mortgage",
          value: countMajor(p.badMortgage?.count),
          note: portfolioBucketNote(p.badMortgage),
          tone: "danger",
          portfolioStatus: "bad",
        },
        {
          id: "mortgage-savings",
          label: "Mortgage savings",
          value: countMajor(ms?.pendingReview ?? ms?.count),
          note: `${countMajor(ms?.pendingReview)} pending review · ${countMajor(ms?.running)} running`,
          tone: "gold",
          special: "mortgage-savings",
        },
      ],
      due: due
        ? {
            label: "Repayment due this week",
            note: `${countMajor(due.scheduledCount)} repayments scheduled across active accounts`,
            amount: due.amount ?? 0,
          }
        : undefined,
      tables: [
        accountsTable,
        productTable,
        {
          id: "mortgage-repayments",
          title: "Repayments",
          description: "Recent repayments received.",
          columns: [
            col("Reference"),
            col("Customer"),
            col("Amount", "right"),
            col("Received on"),
            col("Status"),
          ],
          rows: mapRepaymentRows(p.recentRepayments, false),
        },
        {
          id: "mortgage-failed-repayments",
          title: "Failed repayment",
          description: "Recent repayment attempts that did not go through.",
          columns: [
            col("Reference"),
            col("Customer"),
            col("Amount", "right"),
            col("Attempted on"),
            col("Reason"),
            col("Status"),
          ],
          rows: mapRepaymentRows(p.failedRepayments, true),
        },
      ].filter(keepOverviewTable),
      requests: [],
      mortgageSavingsPending: ms?.pendingReview ?? 0,
      mortgageSavingsRunning: ms?.running ?? 0,
      portfolioAccountsMeta: data.portfolioAccountsMeta,
    }
  }

  if (type === "SAVINGS" && data?.savingsPortfolio) {
    const p = data.savingsPortfolio
    const due = p.contributionsDueThisWeek
    return {
      kpis: [
        {
          id: "savings-active",
          label: "Active savings plan",
          value: countMajor(p.activeSavingsPlan?.count),
          note: p.activeSavingsPlan?.deltaThisMonth != null ? `+${countMajor(p.activeSavingsPlan.deltaThisMonth)} this month` : "Open plans",
          tone: "success",
        },
        {
          id: "savings-inactive",
          label: "Inactive savings plan",
          value: countMajor(p.inactiveSavingsPlan?.count),
          note: "Closed or matured",
          tone: "muted",
        },
        {
          id: "savings-missed",
          label: "Missed contribution",
          value: countMajor(p.missedContribution?.count),
          note: "Behind schedule",
          tone: "warning",
        },
        {
          id: "savings-pending-withdrawal",
          label: "Pending withdrawal",
          value: countMajor(p.pendingWithdrawal?.count),
          note: "Awaiting approval",
          tone: "info",
        },
      ],
      due: due
        ? {
            label: "Contribution due this week",
            note: `${countMajor(due.scheduledCount)} contributions scheduled across active plans`,
            amount: due.amount ?? 0,
          }
        : undefined,
      tables: [
        productTable,
        {
          id: "savings-contributions",
          title: "Recent contributions",
          description: "Latest successful contributions.",
          columns: [
            col("Reference"),
            col("Customer"),
            col("Plan"),
            col("Amount", "right"),
            col("Received on"),
            col("Status"),
          ],
          rows: (p.recentContributions ?? []).map((r) => [
            r.reference || "—",
            r.customerName || "—",
            r.plan || "—",
            moneyMajor(r.amount),
            formatDate(r.receivedOn),
            { badge: titleCaseStatus(r.status || "Successful"), tone: statusTone(r.status || "successful") },
          ]),
        },
      ].filter((t) => t.rows.length > 0 || t.id.endsWith("-products")),
      requests: (p.withdrawalRequests ?? []).map((r, i) => ({
        id: r.reference || `sv-w-${i}`,
        reference: r.reference || "—",
        customer: r.customerName || "—",
        detail: r.plan || "—",
        amount: r.amount ?? 0,
        requestedOn: formatDate(r.requestedOn),
        status: requestStatus(r.status),
      })),
    }
  }

  if (type === "INVESTMENT" && data?.investmentPortfolio) {
    const p = data.investmentPortfolio
    const due = p.maturityDueThisWeek
    return {
      kpis: [
        {
          id: "investment-active",
          label: "Active investment",
          value: countMajor(p.activeInvestment?.count),
          note: p.activeInvestment?.deltaThisMonth != null ? `+${countMajor(p.activeInvestment.deltaThisMonth)} this month` : "Open positions",
          tone: "success",
        },
        {
          id: "investment-matured",
          label: "Matured investment",
          value: countMajor(p.maturedInvestment?.count),
          note: "Completed tenors",
          tone: "muted",
        },
        {
          id: "investment-underperforming",
          label: "Underperforming",
          value: countMajor(p.underperformingInvestment?.count),
          note: "Below target",
          tone: "warning",
        },
        {
          id: "investment-pending-liquidation",
          label: "Pending liquidation",
          value: countMajor(p.pendingLiquidation?.count),
          note: "Awaiting approval",
          tone: "info",
        },
      ],
      due: due
        ? {
            label: "Maturity due this week",
            note: `${countMajor(due.scheduledCount)} positions maturing across active investments`,
            amount: due.amount ?? 0,
          }
        : undefined,
      tables: [
        productTable,
        {
          id: "investment-activity",
          title: "Recent activity",
          description: "Subscriptions and maturity payouts.",
          columns: [
            col("Reference"),
            col("Customer"),
            col("Activity"),
            col("Instrument"),
            col("Amount", "right"),
            col("Date"),
            col("Status"),
          ],
          rows: (p.recentActivity ?? []).map((r) => [
            r.reference || "—",
            r.customerName || "—",
            r.activity || "—",
            r.instrument || "—",
            moneyMajor(r.amount),
            formatDate(r.date),
            { badge: titleCaseStatus(r.status || "Successful"), tone: statusTone(r.status || "successful") },
          ]),
        },
      ].filter((t) => t.rows.length > 0 || t.id.endsWith("-products")),
      requests: (p.liquidationRequests ?? []).map((r, i) => ({
        id: r.reference || `iv-l-${i}`,
        reference: r.reference || "—",
        customer: r.customerName || "—",
        detail: r.instrument || r.activity || "—",
        amount: r.amount ?? 0,
        requestedOn: formatDate(r.requestedOn),
        status: requestStatus(r.status),
      })),
    }
  }

  if (type === "COMMODITY" && data?.commodityPortfolio) {
    const p = data.commodityPortfolio
    const due = p.deliveryDueThisWeek
    return {
      kpis: [
        {
          id: "commodity-active",
          label: "Active commodity plan",
          value: countMajor(p.activeCommodityPlan?.count),
          note: p.activeCommodityPlan?.deltaThisMonth != null ? `+${countMajor(p.activeCommodityPlan.deltaThisMonth)} this month` : "Open plans",
          tone: "success",
        },
        {
          id: "commodity-completed",
          label: "Completed plan",
          value: countMajor(p.completedCommodityPlan?.count),
          note: "Fully delivered",
          tone: "muted",
        },
        {
          id: "commodity-delayed",
          label: "Delayed delivery",
          value: countMajor(p.delayedDelivery?.count),
          note: "Past expected date",
          tone: "warning",
        },
        {
          id: "commodity-pending-liquidation",
          label: "Pending liquidation",
          value: countMajor(p.pendingLiquidation?.count),
          note: "Awaiting approval",
          tone: "info",
        },
      ],
      due: due
        ? {
            label: "Delivery due this week",
            note: `${countMajor(due.scheduledCount)} deliveries scheduled across active plans`,
            amount: due.amount ?? 0,
          }
        : undefined,
      tables: [
        productTable,
        {
          id: "commodity-activity",
          title: "Recent activity",
          description: "Contributions and deliveries.",
          columns: [
            col("Reference"),
            col("Customer"),
            col("Activity"),
            col("Commodity"),
            col("Amount", "right"),
            col("Date"),
            col("Status"),
          ],
          rows: (p.recentActivity ?? []).map((r) => [
            r.reference || "—",
            r.customerName || "—",
            r.activity || "—",
            r.commodity || "—",
            moneyMajor(r.amount),
            formatDate(r.date),
            { badge: titleCaseStatus(r.status || "Successful"), tone: statusTone(r.status || "successful") },
          ]),
        },
      ].filter((t) => t.rows.length > 0 || t.id.endsWith("-products")),
      requests: (p.liquidationRequests ?? []).map((r, i) => ({
        id: r.reference || `cm-l-${i}`,
        reference: r.reference || "—",
        customer: r.customerName || "—",
        detail: r.commodity || r.activity || "—",
        amount: r.amount ?? 0,
        requestedOn: formatDate(r.requestedOn),
        status: requestStatus(r.status),
      })),
    }
  }

  // Fallback: totals-only when portfolio block missing
  const totals = data?.totals
  if (totals) {
    return {
      kpis: [
        {
          id: `${type.toLowerCase()}-customers`,
          label: "Customers",
          value: countMajor(totals.distinctCustomerCount),
          note: "Distinct customers",
          tone: "success",
        },
        {
          id: `${type.toLowerCase()}-applications`,
          label: "Applications",
          value: countMajor(totals.applicationCount),
          note: "All statuses",
          tone: "info",
        },
        {
          id: `${type.toLowerCase()}-capital`,
          label: type === "COMMODITY" ? "Inventory" : "Capital",
          value: moneyMajor(type === "COMMODITY" ? totals.inventoryAmount : totals.capitalAmount),
          note: "Major units",
          tone: "gold",
        },
        {
          id: `${type.toLowerCase()}-issued`,
          label: type === "COMMODITY" ? "Sales" : "Issued",
          value: moneyMajor(type === "COMMODITY" ? totals.salesAmount : totals.issuedAmount),
          note: "Major units",
          tone: "muted",
        },
      ],
      tables: productTable.rows.length ? [productTable] : [],
      requests: [],
    }
  }

  return empty
}

export function categoryCountForTab(
  byCategory: CategoryRow[] | undefined,
  key: ProductOverviewTabKey,
): number {
  const type = tabKeyToApiType(key)
  const row = (byCategory ?? []).find((c) => String(c.type || "").toUpperCase() === type)
  return row?.configuredProductCount ?? 0
}
