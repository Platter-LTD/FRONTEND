import type {
  AnalyticsProductFilter,
  AnalyticsProductType,
  AnalyticsRange,
  AppAnalyticsData,
  AppAnalyticsTopAccount,
} from "@/lib/appAnalytics"
import type { CategoryRow, ProductOverviewData } from "@/lib/productOverview"

const PRODUCT_LABEL: Record<string, string> = {
  LOAN: "Loan",
  MORTGAGE: "Mortgage",
  SAVINGS: "Savings",
  INVESTMENT: "Investment",
  COMMODITY: "Commodity",
}

const ALL_TYPES: AnalyticsProductType[] = ["LOAN", "MORTGAGE", "SAVINGS", "INVESTMENT", "COMMODITY"]

export type TransactionStatsLite = {
  totalTransactions?: number
  totalCreditAmount?: number
  totalDebitAmount?: number
  pendingTransactions?: number
  completedTransactions?: number
  failedTransactions?: number
  netAmount?: number
}

export type TransactionLite = {
  userId?: string
  amount?: number
  status?: string
  createdAt?: string
  type?: string
  description?: string
  currency?: string
}

function num(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/,/g, ""))
    if (Number.isFinite(n)) return n
  }
  return 0
}

function periodForRange(range: AnalyticsRange) {
  const end = new Date()
  const start = new Date(end)
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30
  start.setDate(start.getDate() - days)
  const priorEnd = new Date(start)
  const priorStart = new Date(start)
  priorStart.setDate(priorStart.getDate() - days)
  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    priorPeriod: { start: priorStart.toISOString(), end: priorEnd.toISOString() },
  }
}

function unwrapData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null
  const obj = payload as Record<string, unknown>
  if ("data" in obj && obj.data && typeof obj.data === "object") return obj.data as T
  return obj as T
}

export function unwrapAnalyticsPayload(payload: unknown): AppAnalyticsData | null {
  const data = unwrapData<AppAnalyticsData>(payload)
  if (!data || typeof data !== "object") return null
  if (data.transactionVolume || data.customers || data.byProductType || data.weeklyVolume) return data
  return null
}

export function mergeAnalyticsByType(
  parts: AppAnalyticsData[],
  range: AnalyticsRange,
  productType: AnalyticsProductFilter,
  appId: string,
): AppAnalyticsData | null {
  const usable = parts.filter(Boolean)
  if (!usable.length) return null

  const byProductType = usable.flatMap((p) => p.byProductType ?? [])
  const pendingByProductType = usable.flatMap((p) => p.pendingByProductType ?? [])
  const topAccountsByVolume = usable
    .flatMap((p) => p.topAccountsByVolume ?? [])
    .sort((a, b) => num(b.volume) - num(a.volume))
    .slice(0, 10)

  const volumeAmount = usable.reduce((sum, p) => sum + num(p.transactionVolume?.amount), 0)
  const pendingCount = usable.reduce((sum, p) => sum + num(p.pendingTransactions?.count), 0)
  const pendingAmount = usable.reduce((sum, p) => sum + num(p.pendingTransactions?.amount), 0)
  const registered = Math.max(...usable.map((p) => num(p.customers?.registered)), 0)
  const active = Math.max(...usable.map((p) => num(p.customers?.active)), 0)
  const delta = usable.reduce((sum, p) => sum + num(p.customers?.registeredDeltaThisMonth), 0)

  const weekMap = new Map<number, { label: string; amount: number; start?: string; end?: string }>()
  for (const part of usable) {
    for (const week of part.weeklyVolume ?? []) {
      const current = weekMap.get(week.week) ?? { label: week.label, amount: 0, start: week.start, end: week.end }
      current.amount += num(week.amount)
      weekMap.set(week.week, current)
    }
  }

  const totalByType = byProductType.reduce((sum, row) => sum + num(row.amount), 0)
  const normalizedTypes = (byProductType.length ? byProductType : ALL_TYPES.map((type) => ({
    productType: type,
    label: PRODUCT_LABEL[type],
    amount: 0,
    transactionCount: 0,
    percentage: 0,
  }))).map((row) => ({
    ...row,
    percentage: totalByType > 0 ? Math.round((num(row.amount) / totalByType) * 100) : 0,
  }))

  const { period, priorPeriod } = periodForRange(range)
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    appId,
    currency: usable[0]?.currency || "NGN",
    range,
    productType,
    period,
    priorPeriod,
    customers: {
      registered,
      active,
      registeredDeltaThisMonth: delta,
    },
    transactionVolume: {
      amount: volumeAmount,
      currency: usable[0]?.transactionVolume?.currency || "NGN",
      changePercentVsPrior: usable[0]?.transactionVolume?.changePercentVsPrior ?? 0,
      comparisonLabel: usable[0]?.transactionVolume?.comparisonLabel || `prior ${range}`,
    },
    pendingTransactions: {
      count: pendingCount,
      amount: pendingAmount,
      currency: usable[0]?.pendingTransactions?.currency || "NGN",
    },
    successRate: usable[0]?.successRate ?? { successRatePercent: 0, failedOrReversedPercent: 0 },
    byProductType: productType === "ALL" ? normalizedTypes : normalizedTypes.filter((row) => String(row.productType).toUpperCase() === productType),
    weeklyVolume: [...weekMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, row]) => ({ week, label: row.label || `Week ${week}`, amount: row.amount, start: row.start, end: row.end })),
    pendingByProductType:
      productType === "ALL"
        ? pendingByProductType
        : pendingByProductType.filter((row) => String(row.productType).toUpperCase() === productType),
    topAccountsByVolume:
      productType === "ALL"
        ? topAccountsByVolume
        : topAccountsByVolume.filter((row) => String(row.productType).toUpperCase() === productType),
  }
}

function weeklyFromTransactions(transactions: TransactionLite[], range: AnalyticsRange) {
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30
  const end = Date.now()
  const start = end - days * 24 * 60 * 60 * 1000
  const bucketMs = (end - start) / 4
  const buckets = [0, 0, 0, 0]
  for (const txn of transactions) {
    const ts = txn.createdAt ? new Date(txn.createdAt).getTime() : NaN
    if (!Number.isFinite(ts) || ts < start || ts > end) continue
    const idx = Math.min(3, Math.max(0, Math.floor((ts - start) / bucketMs)))
    buckets[idx] += num(txn.amount)
  }
  return buckets.map((amount, i) => ({
    week: i + 1,
    label: `Week ${i + 1}`,
    amount,
  }))
}

function topAccountsFromTransactions(transactions: TransactionLite[]): AppAnalyticsTopAccount[] {
  const map = new Map<string, { volume: number; count: number; status: string }>()
  for (const txn of transactions) {
    const id = String(txn.userId || "").trim() || "unknown"
    const current = map.get(id) ?? { volume: 0, count: 0, status: txn.status || "Active" }
    current.volume += num(txn.amount)
    current.count += 1
    if (String(txn.status || "").toLowerCase() === "completed" || String(txn.status || "").toLowerCase() === "active") {
      current.status = "Active"
    }
    map.set(id, current)
  }
  return [...map.entries()]
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 10)
    .map(([userId, row]) => ({
      userId,
      customerName: userId === "unknown" ? "Customer" : userId,
      productType: "LOAN",
      product: "Loan",
      volume: row.volume,
      transactionCount: row.count,
      averageTicket: row.count ? row.volume / row.count : 0,
      status: /fail|cancel|inactive/i.test(row.status) ? "Inactive" : "Active",
    }))
}

export function composeAnalyticsFromLiveSources(opts: {
  appId: string
  range: AnalyticsRange
  productType: AnalyticsProductFilter
  overview?: ProductOverviewData | null
  stats?: TransactionStatsLite | null
  transactions?: TransactionLite[] | null
}): AppAnalyticsData {
  const overview = opts.overview ?? null
  const stats = opts.stats ?? null
  const transactions = opts.transactions ?? []
  const { period, priorPeriod } = periodForRange(opts.range)

  const categories = (overview?.byCategory ?? []).filter((row) => {
    if (opts.productType === "ALL") return true
    return String(row.type || "").toUpperCase() === opts.productType
  })

  const amountFor = (row: CategoryRow) => {
    const type = String(row.type || "").toUpperCase()
    if (type === "COMMODITY") return num(row.salesAmount) || num(row.inventoryAmount)
    if (type === "SAVINGS" || type === "INVESTMENT") return num(row.capitalAmount) || num(row.repaymentAmount)
    return num(row.issuedAmount) || num(row.capitalAmount) || num(row.repaymentAmount)
  }

  const byProductType = ALL_TYPES.map((type) => {
    const row = categories.find((c) => String(c.type || "").toUpperCase() === type)
    return {
      productType: type,
      label: PRODUCT_LABEL[type],
      amount: row ? amountFor(row) : 0,
      transactionCount: num(row?.applicationCount),
      percentage: 0,
    }
  })
  const totalAmount = byProductType.reduce((sum, row) => sum + row.amount, 0)
  for (const row of byProductType) {
    row.percentage = totalAmount > 0 ? Math.round((row.amount / totalAmount) * 100) : 0
  }

  const customersFromCategories = categories.reduce((sum, row) => sum + num(row.customerCount), 0)
  const volumeFromOverview =
    num(overview?.headline?.approvedAmount) ||
    num(overview?.headline?.requestedAmount) ||
    totalAmount
  const volumeFromStats = num(stats?.totalCreditAmount) || num(stats?.netAmount)
  const volumeAmount = volumeFromOverview || volumeFromStats

  const completed = num(stats?.completedTransactions)
  const failed = num(stats?.failedTransactions)
  const totalTx = completed + failed || num(stats?.totalTransactions) || num(overview?.headline?.totalTransactions)
  const successRatePercent = totalTx > 0 ? Math.round((completed / Math.max(completed + failed, 1)) * 1000) / 10 : 0

  const weeklyFromTx = weeklyFromTransactions(transactions, opts.range)
  const weeklyVolume =
    weeklyFromTx.some((w) => w.amount > 0)
      ? weeklyFromTx
      : [1, 2, 3, 4].map((week) => ({ week, label: `Week ${week}`, amount: 0 }))

  const topFromTx = topAccountsFromTransactions(transactions)

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    appId: opts.appId,
    currency: "NGN",
    range: opts.range,
    productType: opts.productType,
    period,
    priorPeriod,
    customers: {
      registered: customersFromCategories,
      active: customersFromCategories,
      registeredDeltaThisMonth: 0,
    },
    transactionVolume: {
      amount: volumeAmount,
      currency: "NGN",
      changePercentVsPrior: 0,
      comparisonLabel: `prior ${opts.range}`,
    },
    pendingTransactions: {
      count: num(stats?.pendingTransactions),
      amount: 0,
      currency: "NGN",
    },
    successRate: {
      successRatePercent: completed + failed > 0 ? successRatePercent : 0,
      failedOrReversedPercent: completed + failed > 0 ? Math.round((1000 - successRatePercent * 10)) / 10 : 0,
    },
    byProductType: opts.productType === "ALL" ? byProductType : byProductType.filter((row) => row.productType === opts.productType),
    weeklyVolume,
    pendingByProductType: ALL_TYPES.map((type) => ({
      productType: type,
      label: PRODUCT_LABEL[type],
      pendingCount: 0,
      value: 0,
      oldest: "",
    })),
    topAccountsByVolume: topFromTx,
  }
}

export function unwrapOverviewPayload(payload: unknown): ProductOverviewData | null {
  const data = unwrapData<Record<string, unknown>>(payload)
  if (!data) return null
  const asOverview = data as ProductOverviewData
  if (Array.isArray(asOverview.byCategory) || asOverview.headline) return asOverview
  for (const key of ["overview", "productOverview", "result"]) {
    const nested = data[key]
    if (nested && typeof nested === "object") {
      const inner = nested as ProductOverviewData
      if (Array.isArray(inner.byCategory) || inner.headline) return inner
    }
  }
  return asOverview
}

export function unwrapStatsPayload(payload: unknown): TransactionStatsLite | null {
  return unwrapData<TransactionStatsLite>(payload)
}

export function unwrapTransactionsPayload(payload: unknown): TransactionLite[] {
  const data = unwrapData<unknown>(payload)
  if (Array.isArray(data)) return data as TransactionLite[]
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.transactions)) return obj.transactions as TransactionLite[]
    if (Array.isArray(obj.items)) return obj.items as TransactionLite[]
  }
  return []
}
