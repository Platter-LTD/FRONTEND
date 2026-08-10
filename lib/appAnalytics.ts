export type AnalyticsRange = "7d" | "30d" | "90d"
export type AnalyticsProductType = "LOAN" | "MORTGAGE" | "SAVINGS" | "INVESTMENT" | "COMMODITY"
export type AnalyticsProductFilter = AnalyticsProductType | "ALL"

export type AppAnalyticsPeriod = { start: string; end: string }

export type AppAnalyticsCustomers = {
  registered: number
  active: number
  registeredDeltaThisMonth: number
}

export type AppAnalyticsVolume = {
  amount: number
  currency: string
  changePercentVsPrior: number
  comparisonLabel: string
}

export type AppAnalyticsPending = {
  count: number
  amount: number
  currency: string
}

export type AppAnalyticsSuccessRate = {
  successRatePercent: number
  failedOrReversedPercent: number
}

export type AppAnalyticsByProduct = {
  productType: AnalyticsProductType | string
  label: string
  amount: number
  transactionCount: number
  percentage: number
}

export type AppAnalyticsWeeklyVolume = {
  week: number
  label: string
  start?: string
  end?: string
  amount: number
}

export type AppAnalyticsPendingByProduct = {
  productType: AnalyticsProductType | string
  label: string
  pendingCount: number
  value: number
  oldest: string
  oldestAt?: string
}

export type AppAnalyticsTopAccount = {
  userId: string
  customerName: string
  productType: AnalyticsProductType | string
  product: string
  volume: number
  transactionCount: number
  averageTicket: number
  status: string
}

export type AppAnalyticsData = {
  schemaVersion?: number
  generatedAt?: string
  appId?: string
  merchantId?: string
  currency?: string
  range?: AnalyticsRange
  productType?: AnalyticsProductFilter
  period?: AppAnalyticsPeriod
  priorPeriod?: AppAnalyticsPeriod
  customers?: AppAnalyticsCustomers
  transactionVolume?: AppAnalyticsVolume
  pendingTransactions?: AppAnalyticsPending
  successRate?: AppAnalyticsSuccessRate
  byProductType?: AppAnalyticsByProduct[]
  weeklyVolume?: AppAnalyticsWeeklyVolume[]
  pendingByProductType?: AppAnalyticsPendingByProduct[]
  topAccountsByVolume?: AppAnalyticsTopAccount[]
}

export type AppAnalyticsResponse = {
  success?: boolean
  data?: AppAnalyticsData | null
  error?: string
}

export const ANALYTICS_RANGES: AnalyticsRange[] = ["7d", "30d", "90d"]

export const ANALYTICS_PRODUCT_OPTIONS: { value: AnalyticsProductFilter; label: string }[] = [
  { value: "ALL", label: "All products" },
  { value: "MORTGAGE", label: "Mortgage" },
  { value: "LOAN", label: "Loan" },
  { value: "SAVINGS", label: "Savings" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "COMMODITY", label: "Commodity" },
]

export const PRODUCT_PILLAR_COLORS: Record<string, string> = {
  MORTGAGE: "#0B1E3B",
  LOAN: "#C9A24B",
  SAVINGS: "#1D9E75",
  INVESTMENT: "#3B5BA9",
  COMMODITY: "#C0603B",
}

export function unwrapAppAnalytics(res: unknown): AppAnalyticsData | null {
  if (!res || typeof res !== "object") return null
  const obj = res as Record<string, unknown>
  if ("data" in obj) {
    const inner = obj.data
    if (!inner || typeof inner !== "object") return null
    return inner as AppAnalyticsData
  }
  return obj as AppAnalyticsData
}

export function formatNaira(amount: number | undefined | null) {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0
  return `₦${n.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatNairaCompact(amount: number | undefined | null) {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `₦${(n / 1_000).toFixed(1)}K`
  return formatNaira(n)
}

export function formatCount(value: number | undefined | null) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0
  return n.toLocaleString("en-NG")
}

export function formatSignedPercent(value: number | undefined | null) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(1)}%`
}

export function oldestTone(oldest: string | undefined | null): "ok" | "warn" | "late" {
  const s = String(oldest || "").trim().toLowerCase()
  if (!s) return "ok"
  const num = parseInt(s, 10)
  if (!Number.isFinite(num)) return "ok"
  if (s.endsWith("d")) {
    if (num >= 4) return "late"
    if (num >= 2) return "warn"
    return "ok"
  }
  if (s.endsWith("h")) {
    if (num >= 48) return "late"
    if (num >= 24) return "warn"
    return "ok"
  }
  return "ok"
}

export function volumeCaption(range: AnalyticsRange) {
  if (range === "7d") return "Weekly transaction volume, last 7 days"
  if (range === "90d") return "Weekly transaction volume, last 90 days"
  return "Weekly transaction volume, last 30 days"
}
