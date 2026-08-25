"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { appApi } from "@/lib/services/appService"
import {
  ANALYTICS_PRODUCT_OPTIONS,
  ANALYTICS_RANGES,
  PRODUCT_PILLAR_COLORS,
  formatCount,
  formatNaira,
  formatNairaCompact,
  formatSignedPercent,
  oldestTone,
  unwrapAppAnalytics,
  volumeCaption,
  type AnalyticsProductFilter,
  type AnalyticsRange,
  type AppAnalyticsData,
} from "@/lib/appAnalytics"

const BADGE_TONE = {
  ok: "bg-[rgba(29,158,117,0.12)] text-[#1D9E75]",
  warn: "bg-[rgba(201,133,46,0.12)] text-[#C9852E]",
  late: "bg-[rgba(192,57,43,0.12)] text-[#C0392B]",
}

function EmptyBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-[#E4E6EA] bg-white px-6 py-16 text-center">
      <p className="text-base font-medium text-[#0B1E3B]">{title}</p>
      <p className="mt-1.5 text-sm text-[#5B6472]">{description}</p>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#E4E6EA] bg-white px-6 py-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-28" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[#E4E6EA] bg-white p-6">
        <Skeleton className="mb-4 h-5 w-64" />
        <Skeleton className="h-[240px] w-full" />
      </div>
      <div className="rounded-xl border border-[#E4E6EA] bg-white p-6">
        <Skeleton className="mb-4 h-5 w-52" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-[#E4E6EA] bg-white p-6">
        <Skeleton className="mb-4 h-5 w-56" />
        <TableSkeleton columnCount={6} rowCount={5} />
      </div>
    </div>
  )
}

export default function PlataAnalyticsDashboard({ appId }: { appId?: string }) {
  const [range, setRange] = useState<AnalyticsRange>("30d")
  const [productType, setProductType] = useState<AnalyticsProductFilter>("ALL")
  const [data, setData] = useState<AppAnalyticsData | null>(null)
  const [loading, setLoading] = useState(Boolean(appId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!appId) {
      setLoading(false)
      setData(null)
      setError("Open analytics from an app to load live customer activity.")
      return
    }
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    void appApi
      .getAppAnalytics(appId, { range, productType }, ac.signal)
      .then((res) => {
        setData(unwrapAppAnalytics(res))
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setData(null)
        setError(err instanceof Error ? err.message : "Failed to load analytics")
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [appId, range, productType])

  const customers = data?.customers
  const volume = data?.transactionVolume
  const pending = data?.pendingTransactions
  const success = data?.successRate
  const activeShare =
    customers && customers.registered > 0
      ? Math.round((customers.active / customers.registered) * 100)
      : null

  const kpis = [
    {
      label: "Transaction volume",
      value: formatNairaCompact(volume?.amount),
      delta: volume
        ? `${formatSignedPercent(volume.changePercentVsPrior)} vs ${volume.comparisonLabel || "prior period"}`
        : "—",
      tone: (volume?.changePercentVsPrior ?? 0) >= 0 ? ("up" as const) : ("muted" as const),
    },
    {
      label: "Registered customers",
      value: formatCount(customers?.registered),
      delta:
        customers?.registeredDeltaThisMonth != null
          ? `${customers.registeredDeltaThisMonth >= 0 ? "+" : ""}${formatCount(customers.registeredDeltaThisMonth)} this month`
          : "—",
      tone: "up" as const,
    },
    {
      label: "Active customers",
      value: formatCount(customers?.active),
      delta: activeShare != null ? `${activeShare}% of registered` : "Customers with activity",
      tone: "muted" as const,
    },
    {
      label: "Pending transactions",
      value: formatCount(pending?.count),
      delta: pending ? `${formatNairaCompact(pending.amount)} awaiting settlement` : "—",
      tone: "warn" as const,
    },
    {
      label: "Success rate",
      value: success ? `${Number(success.successRatePercent ?? 0).toFixed(1)}%` : "—",
      delta: success ? `${Number(success.failedOrReversedPercent ?? 0).toFixed(1)}% failed or reversed` : "—",
      tone: "muted" as const,
    },
  ]

  const chartData = useMemo(
    () =>
      (data?.weeklyVolume ?? []).map((row) => ({
        label: row.label || `Week ${row.week}`,
        value: row.amount ?? 0,
      })),
    [data?.weeklyVolume],
  )

  const pillars = data?.byProductType ?? []
  const topAccounts = data?.topAccountsByVolume ?? []
  const pendingRows = data?.pendingByProductType ?? []

  return (
    <div className="min-h-full w-full bg-[#F7F7F5] text-[#0B1E3B] antialiased [font-variant-numeric:tabular-nums]">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 pb-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1E3B]">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#C9A24B]" />
            </div>
            <div>
              <div className="text-lg font-medium">Plata analytics</div>
              <div className="text-xs text-[#5B6472]">Customer transaction overview</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-[10px] border border-[#E4E6EA] bg-white p-[3px]">
              {ANALYTICS_RANGES.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  className={`rounded-[7px] px-4 py-[7px] text-[13px] font-medium transition-colors ${
                    range === key
                      ? "bg-[#0B1E3B] text-white"
                      : "bg-transparent text-[#5B6472] hover:text-[#0B1E3B]"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
            <select
              className="min-w-[170px] rounded-[10px] border border-[#E4E6EA] bg-white px-3.5 py-[9px] text-[13px] text-[#0B1E3B]"
              value={productType}
              onChange={(e) => setProductType(e.target.value as AnalyticsProductFilter)}
            >
              {ANALYTICS_PRODUCT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <AnalyticsSkeleton />
        ) : error ? (
          <EmptyBlock title="Couldn’t load analytics" description={error} />
        ) : !data ? (
          <EmptyBlock
            title="No analytics yet"
            description="When customers start transacting on this app, volume and activity will show here."
          />
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-[#E4E6EA] bg-white px-6 py-5">
                  <p className="mb-2.5 flex items-center gap-1.5 text-[13px] uppercase tracking-[0.02em] text-[#5B6472]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A24B]" />
                {kpi.label}
              </p>
                  <p className="m-0 text-[26px] font-semibold text-[#0B1E3B] sm:text-2xl">{kpi.value}</p>
                  <p
                    className={`mt-2 text-xs ${
                      kpi.tone === "up"
                        ? "text-[#1D9E75]"
                        : kpi.tone === "warn"
                          ? "text-[#C9852E]"
                          : "text-[#5B6472]"
                    }`}
              >
                {kpi.delta}
              </p>
            </div>
          ))}
        </div>

            <div className="mb-8 rounded-xl border border-[#E4E6EA] bg-white p-6">
              <p className="mb-4 text-lg font-medium">{volumeCaption(range)}</p>
              {chartData.length === 0 ? (
                <p className="py-16 text-center text-sm text-[#5B6472]">No weekly volume for this period.</p>
              ) : (
                <div className="h-[240px] w-full min-w-0 sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                        <linearGradient id="plataTrendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C9A24B" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#C9A24B" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                      <CartesianGrid stroke="#E4E6EA" vertical={false} />
                <XAxis
                  dataKey="label"
                        tick={{ fill: "#9AA1AC", fontSize: 11 }}
                        axisLine={false}
                  tickLine={false}
                />
                <YAxis
                        tick={{ fill: "#9AA1AC", fontSize: 11 }}
                        axisLine={false}
                  tickLine={false}
                        width={56}
                        tickFormatter={(v: number) => formatNairaCompact(v)}
                />
                <Tooltip
                  contentStyle={{
                          background: "#0B1E3B",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#fff" }}
                        formatter={(value: number | string) => [formatNaira(Number(value)), "Volume"]}
                />
                <Area
                  type="monotone"
                        dataKey="value"
                        stroke="#0B1E3B"
                  strokeWidth={2}
                        fill="url(#plataTrendFill)"
                        dot={{ r: 3, fill: "#C9A24B", stroke: "#0B1E3B", strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
              )}
            </div>

            <div className="mb-8 rounded-xl border border-[#E4E6EA] bg-white p-6">
              <p className="mb-4 text-lg font-medium">Transactions by product type</p>
              {pillars.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#5B6472]">No product breakdown yet.</p>
              ) : (
          <div className="space-y-4">
                  {pillars.map((p) => {
                    const color = PRODUCT_PILLAR_COLORS[String(p.productType || "").toUpperCase()] || "#5B6472"
                    const width = Math.max(0, Math.min(100, p.percentage ?? 0))
                    return (
                      <div key={`${p.productType}-${p.label}`}>
                        <div className="mb-1.5 flex justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium">
                            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
                            {p.label || p.productType}
                  </span>
                          <span className="text-[#5B6472]">
                            {formatNairaCompact(p.amount)} · {formatCount(p.transactionCount)} txns · {p.percentage ?? 0}%
                  </span>
                </div>
                        <div className="h-2 overflow-hidden rounded bg-[#F7F7F5]">
                          <div className="h-full rounded" style={{ width: `${width}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
          </div>

            <div className="mb-8 overflow-x-auto rounded-xl border border-[#E4E6EA] bg-white p-6">
              <p className="mb-4 text-lg font-medium">Volume per customer, top accounts</p>
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                    {["Customer", "Product", "Volume", "Txns", "Avg. ticket", "Status"].map((h, i) => (
                      <th
                        key={h}
                        className={`border-b border-[#E4E6EA] px-3 pb-2.5 text-left text-xs font-medium uppercase tracking-[0.02em] text-[#5B6472] ${
                          i >= 2 && i <= 4 ? "text-right" : ""
                        }`}
                      >
                        {h}
                    </th>
                    ))}
              </tr>
            </thead>
            <tbody>
                  {topAccounts.map((row) => {
                    const active = String(row.status || "").toLowerCase() === "active"
                    return (
                      <tr key={`${row.userId}-${row.productType}`}>
                        <td className="border-b border-[#E4E6EA] px-3 py-3.5">{row.customerName || "—"}</td>
                        <td className="border-b border-[#E4E6EA] px-3 py-3.5">{row.product || row.productType}</td>
                        <td className="border-b border-[#E4E6EA] px-3 py-3.5 text-right">
                          {formatNairaCompact(row.volume)}
                  </td>
                        <td className="border-b border-[#E4E6EA] px-3 py-3.5 text-right">
                          {formatCount(row.transactionCount)}
                  </td>
                        <td className="border-b border-[#E4E6EA] px-3 py-3.5 text-right">
                          {formatNairaCompact(row.averageTicket)}
                  </td>
                        <td className="border-b border-[#E4E6EA] px-3 py-3.5">
                    <span
                            className={`inline-block rounded-full px-2.5 py-[3px] text-[11px] font-medium ${
                              active
                          ? "bg-[rgba(29,158,117,0.12)] text-[#1D9E75]"
                                : "bg-[rgba(192,57,43,0.12)] text-[#C0392B]"
                            }`}
                    >
                            {row.status || "—"}
                    </span>
                  </td>
                </tr>
                    )
                  })}
                  {topAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-sm text-[#5B6472]">
                        No customer volume yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E4E6EA] bg-white p-6">
              <p className="mb-4 text-lg font-medium">Pending transactions by product</p>
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                    {["Product", "Pending", "Value", "Oldest"].map((h, i) => (
                      <th
                        key={h}
                        className={`border-b border-[#E4E6EA] px-3 pb-2.5 text-left text-xs font-medium uppercase tracking-[0.02em] text-[#5B6472] ${
                          i === 1 || i === 2 ? "text-right" : ""
                        }`}
                      >
                        {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
                  {pendingRows.map((row) => (
                    <tr key={`${row.productType}-${row.label}`}>
                      <td className="border-b border-[#E4E6EA] px-3 py-3.5">{row.label || row.productType}</td>
                      <td className="border-b border-[#E4E6EA] px-3 py-3.5 text-right">
                        {formatCount(row.pendingCount)}
                  </td>
                      <td className="border-b border-[#E4E6EA] px-3 py-3.5 text-right">
                        {formatNairaCompact(row.value)}
                  </td>
                      <td className="border-b border-[#E4E6EA] px-3 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-[3px] text-[11px] font-medium ${BADGE_TONE[oldestTone(row.oldest)]}`}
                        >
                          {row.oldest || "—"}
                        </span>
                  </td>
                </tr>
              ))}
                  {pendingRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-sm text-[#5B6472]">
                        No pending transactions.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
