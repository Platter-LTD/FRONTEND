/**
 * Product Overview types + helpers (Plata).
 * GET /api/v1/products/overview?appId=...
 * GET /api/v1/products?appId=...&status=...&type=...&page=...&limit=...
 */

export type ProductOverviewTabKey = "loan" | "mortgage" | "savings" | "investment" | "commodity"

export type OverviewTone = "success" | "muted" | "warning" | "danger" | "gold" | "info"

export type CatalogStatusFilter = "all" | "active" | "inactive" | "pendingConfiguration" | "featured"

export type CatalogOverviewTotals = {
  all?: number
  active?: number
  inactive?: number
  pendingConfiguration?: number
  featured?: number
}

export type CatalogOverviewByType = {
  loan?: number
  mortgage?: number
  savings?: number
  commodity?: number
  investment?: number
}

export type CatalogProductOverview = {
  totals?: CatalogOverviewTotals
  byType?: CatalogOverviewByType
}

export type CatalogProductItem = {
  id?: string
  name?: string
  type?: string
  status?: string
  isActive?: boolean
  configured?: boolean
  isFeatured?: boolean
  createdAt?: string
  updatedAt?: string
  appId?: string
  referenceNumber?: string
}

export type CatalogProductPagination = {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
}

export type CatalogProductList = {
  items?: CatalogProductItem[]
  pagination?: CatalogProductPagination
}

export type ListProductsParams = {
  appId: string
  status?: CatalogStatusFilter
  type?: ProductOverviewTabKey | "all"
  page?: number
  limit?: number
  search?: string
}

/** Legacy analytics compose types (older overview payloads). */
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
  totals?: CatalogOverviewTotals
  byType?: CatalogOverviewByType
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

export function unwrapCatalogOverview(res: unknown): CatalogProductOverview | null {
  return unwrapApiData<CatalogProductOverview>(res)
}

export function unwrapCatalogProductList(res: unknown): CatalogProductList {
  const inner = unwrapApiData<CatalogProductList | CatalogProductItem[] | Record<string, unknown>>(res)
  if (Array.isArray(inner)) return { items: inner, pagination: { page: 1, limit: inner.length, total: inner.length, totalPages: 1 } }
  if (inner && typeof inner === "object") {
    const obj = inner as Record<string, unknown>
    if (Array.isArray(obj.items)) {
      return {
        items: obj.items as CatalogProductItem[],
        pagination: (obj.pagination as CatalogProductPagination | undefined) ?? undefined,
      }
    }
  }
  return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
}

export function extractProductItems(res: unknown): CatalogProductItem[] {
  return unwrapCatalogProductList(res).items ?? []
}

export function countMajor(value: number | undefined | null) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0
  return n.toLocaleString("en-NG")
}

export function formatOverviewDate(iso?: string | null) {
  if (!iso || typeof iso !== "string") return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function titleCaseStatus(status?: string) {
  const s = String(status || "—").trim()
  if (!s) return "—"
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}

export function productStatusTone(status?: string, isActive?: boolean, isFeatured?: boolean): OverviewTone {
  if (isFeatured) return "gold"
  const s = String(status || "").toLowerCase()
  if (s === "active" && isActive !== false) return "success"
  if (s === "inactive" || isActive === false) return "muted"
  if (s === "draft" || s.includes("pending")) return "warning"
  return "muted"
}

/**
 * Map overview card / tab filters onto the list endpoint query.
 * Pending configuration uses `configured=false` (status=pendingConfiguration is rejected).
 * Featured uses `isFeatured=true` (status=featured is rejected).
 */
export function buildProductListSearchParams(params: ListProductsParams): URLSearchParams {
  const q = new URLSearchParams()
  q.set("appId", params.appId)
  q.set("page", String(Math.max(1, params.page ?? 1)))
  q.set("limit", String(Math.min(100, Math.max(1, params.limit ?? 20))))

  if (params.type && params.type !== "all") {
    q.set("type", params.type.toLowerCase())
  }

  if (params.status === "active" || params.status === "inactive") {
    q.set("status", params.status)
  } else if (params.status === "pendingConfiguration") {
    q.set("configured", "false")
  } else if (params.status === "featured") {
    q.set("isFeatured", "true")
  }

  const search = params.search?.trim()
  if (search) q.set("search", search)

  return q
}

// ─── By-type portfolio overview (LOAN / MORTGAGE / …) ─────────────────────────

export type PortfolioStatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "non_performing"
  | "bad"

export type ProductOverviewByTypeParams = {
  appId: string
  productType: "LOAN" | "MORTGAGE" | "SAVINGS" | "INVESTMENT" | "COMMODITY" | string
  portfolioStatus?: PortfolioStatusFilter
  limit?: number
  skip?: number
}

export type PortfolioKpiBucket = {
  count: number
  delta?: number
  subtitle?: string
}

export type PortfolioLoanAccount = {
  id?: string
  loanRef?: string
  customerName?: string
  principal?: number
  status?: string
  portfolioStatus?: string
  disbursedAt?: string
}

export type PortfolioRepaymentRow = {
  id?: string
  loanRef?: string
  customerName?: string
  amount?: number
  date?: string
  status?: string
  reason?: string
}

export type PortfolioDueCallout = {
  amount: number
  repaymentCount?: number
  activeLoanCount?: number
  subtitle?: string
  label?: string
}

export type ProductOverviewByTypeData = {
  activeLoan: PortfolioKpiBucket
  inactiveLoan: PortfolioKpiBucket
  nonPerformingLoan: PortfolioKpiBucket
  badLoan: PortfolioKpiBucket
  repaymentDue?: PortfolioDueCallout | null
  loanAccounts: PortfolioLoanAccount[]
  repayments: PortfolioRepaymentRow[]
  failedRepayments: PortfolioRepaymentRow[]
  portfolioAccountsMeta?: {
    portfolioStatus?: string
    total?: number
    limit?: number
    skip?: number
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim()) {
      const n = Number(value.replace(/[^\d.-]/g, ""))
      if (Number.isFinite(n)) return n
    }
  }
  return undefined
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function normalizeKpiBucket(raw: unknown, fallbackSubtitle?: string): PortfolioKpiBucket {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { count: raw, subtitle: fallbackSubtitle }
  }
  const obj = asRecord(raw)
  if (!obj) return { count: 0, subtitle: fallbackSubtitle }
  const delta = pickNumber(
    obj.deltaThisMonth,
    obj.delta,
    obj.change,
    obj.thisMonth,
    obj.addedThisMonth,
  )
  // Prefer API-provided note; otherwise kpiDeltaLabel will format deltaThisMonth.
  return {
    count: pickNumber(obj.count, obj.total, obj.value, obj.amount) ?? 0,
    delta,
    subtitle: pickString(obj.subtitle, obj.note, obj.label, obj.description) || undefined,
  }
}

function normalizeLoanAccount(raw: unknown): PortfolioLoanAccount | null {
  const obj = asRecord(raw)
  if (!obj) return null
  return {
    id: pickString(obj.id, obj.applicationId, obj.accountId),
    loanRef: pickString(
      obj.loanRef,
      obj.reference,
      obj.referenceNumber,
      obj.globalProductReferenceNumber,
      obj.id,
    ),
    customerName: pickString(
      obj.customerName,
      obj.userName,
      obj.fullName,
      obj.name,
      obj.applicantName,
    ),
    principal: pickNumber(
      obj.principal,
      obj.principalAmount,
      obj.outstanding,
      obj.approvedAmount,
      obj.approvedLoanAmount,
      obj.amount,
      obj.disbursedAmount,
    ),
    status: pickString(obj.status, obj.loanStatus, obj.accountStatus),
    portfolioStatus: pickString(
      obj.portfolioStatus,
      obj.portfolio_status,
      obj.statusBucket,
      obj.status,
    ),
    disbursedAt: pickString(
      obj.disbursedAt,
      obj.disbursementDate,
      obj.fundedAt,
      obj.createdAt,
    ),
  }
}

function normalizeRepayment(raw: unknown): PortfolioRepaymentRow | null {
  const obj = asRecord(raw)
  if (!obj) return null
  return {
    id: pickString(obj.id, obj.reference),
    loanRef: pickString(obj.loanRef, obj.reference, obj.referenceNumber, obj.loanId),
    customerName: pickString(obj.customerName, obj.userName, obj.fullName, obj.name),
    amount: pickNumber(obj.amount, obj.repaymentAmount, obj.value),
    date: pickString(
      obj.attemptedOn,
      obj.date,
      obj.paidAt,
      obj.createdAt,
      obj.failedAt,
    ),
    status: pickString(obj.status),
    reason: pickString(obj.reason, obj.failureReason, obj.error, obj.message),
  }
}

function normalizeDueCallout(raw: unknown, activeCount: number): PortfolioDueCallout | null {
  const obj = asRecord(raw)
  if (!obj) return null
  const amount = pickNumber(obj.amount, obj.totalAmount, obj.value, obj.dueAmount) ?? 0
  const repaymentCount = pickNumber(
    obj.scheduledCount,
    obj.repaymentCount,
    obj.count,
    obj.repayments,
  )
  return {
    amount,
    repaymentCount,
    activeLoanCount: pickNumber(obj.activeLoanCount, obj.activeLoans) ?? activeCount,
    subtitle: pickString(obj.subtitle, obj.description, obj.note),
    label: pickString(obj.label, obj.title) || "Repayment due this week",
  }
}

/**
 * Normalize by-type LOAN overview payloads from product-ms.
 * Real shape nests portfolio KPIs / repayments under `data.loanPortfolio`.
 */
export function unwrapProductOverviewByType(res: unknown): ProductOverviewByTypeData {
  const inner = unwrapApiData<Record<string, unknown>>(res) || asRecord(res) || {}
  const portfolio =
    asRecord(inner.loanPortfolio) ||
    asRecord(inner.portfolio) ||
    asRecord(inner.kpis) ||
    asRecord(inner.buckets) ||
    inner

  const activeLoan = normalizeKpiBucket(
    portfolio.activeLoan ?? portfolio.active ?? inner.activeLoan,
  )
  const inactiveLoan = normalizeKpiBucket(
    portfolio.inactiveLoan ?? portfolio.inactive ?? inner.inactiveLoan,
    "Matured or closed",
  )
  const nonPerformingLoan = normalizeKpiBucket(
    portfolio.nonPerformingLoan ??
      portfolio.non_performing ??
      portfolio.nonPerforming ??
      inner.nonPerformingLoan,
    "90+ days overdue",
  )
  const badLoan = normalizeKpiBucket(
    portfolio.badLoan ?? portfolio.bad ?? inner.badLoan,
    "Written off",
  )

  const accountsRaw =
    (Array.isArray(inner.loanAccounts) && inner.loanAccounts) ||
    (Array.isArray(portfolio.loanAccounts) && portfolio.loanAccounts) ||
    (Array.isArray(inner.accounts) && inner.accounts) ||
    (Array.isArray(inner.portfolioAccounts) && inner.portfolioAccounts) ||
    (Array.isArray(inner.items) && inner.items) ||
    []

  const repaymentsRaw =
    (Array.isArray(portfolio.recentRepayments) && portfolio.recentRepayments) ||
    (Array.isArray(inner.recentRepayments) && inner.recentRepayments) ||
    (Array.isArray(portfolio.repayments) && portfolio.repayments) ||
    (Array.isArray(inner.repayments) && inner.repayments) ||
    []

  const failedRaw =
    (Array.isArray(portfolio.failedRepayments) && portfolio.failedRepayments) ||
    (Array.isArray(inner.failedRepayments) && inner.failedRepayments) ||
    (Array.isArray(portfolio.failed_repayments) && portfolio.failed_repayments) ||
    []

  const meta = asRecord(inner.portfolioAccountsMeta) || asRecord(inner.meta) || undefined

  const dueRaw =
    portfolio.repaymentsDueThisWeek ??
    portfolio.repaymentDueThisWeek ??
    portfolio.repaymentDue ??
    inner.repaymentsDueThisWeek ??
    inner.repaymentDueThisWeek ??
    inner.repaymentDue ??
    inner.dueThisWeek

  return {
    activeLoan,
    inactiveLoan,
    nonPerformingLoan,
    badLoan,
    repaymentDue: normalizeDueCallout(dueRaw, activeLoan.count),
    loanAccounts: accountsRaw
      .map(normalizeLoanAccount)
      .filter((row): row is PortfolioLoanAccount => row != null),
    repayments: repaymentsRaw
      .map(normalizeRepayment)
      .filter((row): row is PortfolioRepaymentRow => row != null),
    failedRepayments: failedRaw
      .map(normalizeRepayment)
      .filter((row): row is PortfolioRepaymentRow => row != null),
    portfolioAccountsMeta: meta
      ? {
          portfolioStatus: pickString(meta.portfolioStatus, meta.status),
          total: pickNumber(meta.total, meta.count),
          limit: pickNumber(meta.limit),
          skip: pickNumber(meta.skip),
        }
      : undefined,
  }
}

export function portfolioStatusLabel(status: PortfolioStatusFilter): string {
  switch (status) {
    case "active":
      return "Active loans"
    case "inactive":
      return "Inactive loans"
    case "non_performing":
      return "Non-performing loans"
    case "bad":
      return "Bad loans"
    default:
      return "All loans"
  }
}

export function portfolioAccountStatusTone(status?: string): OverviewTone {
  const s = String(status || "").toLowerCase().replace(/[-\s]+/g, "_")
  if (s.includes("non_performing") || s.includes("npl")) return "warning"
  if (s.includes("bad") || s.includes("write")) return "danger"
  if (s.includes("inactive") || s.includes("closed") || s.includes("matured")) return "muted"
  if (s.includes("active") || s.includes("success") || s.includes("paid")) return "success"
  return "muted"
}

export function formatPortfolioMoney(amount?: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return "—"
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatPortfolioMoneyCompact(amount?: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return "—"
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`
  return formatPortfolioMoney(amount)
}

export function kpiDeltaLabel(bucket: PortfolioKpiBucket, fallback: string): string {
  if (bucket.subtitle) return bucket.subtitle
  if (typeof bucket.delta === "number" && Number.isFinite(bucket.delta)) {
    const sign = bucket.delta >= 0 ? "+" : ""
    return `${sign}${bucket.delta.toLocaleString("en-NG")} this month`
  }
  return fallback
}
