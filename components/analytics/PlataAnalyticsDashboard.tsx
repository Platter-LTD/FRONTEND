"use client"

import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type RangeKey = "7d" | "30d" | "90d"

const DEMO_TREND: Record<
  RangeKey,
  { labels: string[]; data: number[]; caption: string }
> = {
  "7d": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    data: [58, 62, 55, 70, 68, 75, 80],
    caption: "Daily transaction volume, last 7 days (₦M)",
  },
  "30d": {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    data: [340, 368, 395, 421],
    caption: "Weekly transaction volume, last 30 days (₦M)",
  },
  "90d": {
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
    data: [210, 225, 198, 240, 232, 255, 270, 290, 305, 298, 320, 340],
    caption: "Weekly transaction volume, last 90 days (₦M)",
  },
}

const PILLARS = [
  { name: "Mortgage", color: "#0B1E3B", meta: "₦92.1M · 340 txns · 19%", width: "19%" },
  { name: "Loan", color: "#C9A24B", meta: "₦128.3M · 3,110 txns · 27%", width: "27%" },
  { name: "Savings", color: "#1D9E75", meta: "₦210.4M · 8,420 txns · 43%", width: "43%" },
  { name: "Investment", color: "#3B5BA9", meta: "₦38.2M · 1,560 txns · 8%", width: "8%" },
  { name: "Commodity", color: "#C0603B", meta: "₦14.6M · 640 txns · 3%", width: "3%" },
] as const

const MERCHANTS = [
  { name: "Diaspora Partners UK", product: "Mortgage", volume: "₦58.0M", txns: "6", avg: "₦9.7M", active: true },
  { name: "AG Cooperative Lagos", product: "Savings", volume: "₦42.1M", txns: "1,204", avg: "₦35.0K", active: true },
  { name: "Redeemed Christian FI", product: "Loan", volume: "₦27.4M", txns: "210", avg: "₦130.5K", active: true },
  { name: "Winners Chapel Coop", product: "Savings", volume: "₦31.8M", txns: "890", avg: "₦35.7K", active: true },
  { name: "Unilag Cooperative", product: "Savings", volume: "₦19.6M", txns: "640", avg: "₦30.6K", active: true },
  { name: "Lagos Traders Union", product: "Commodity", volume: "₦4.2M", txns: "180", avg: "₦23.3K", active: false },
] as const

const PENDING = [
  { product: "Mortgage", pending: "12", value: "₦86.4M", age: "4d", tone: "late" as const },
  { product: "Loan", pending: "48", value: "₦6.1M", age: "1d", tone: "ok" as const },
  { product: "Savings", pending: "62", value: "₦2.8M", age: "6h", tone: "ok" as const },
  { product: "Investment", pending: "22", value: "₦2.4M", age: "2d", tone: "warn" as const },
  { product: "Commodity", pending: "12", value: "₦0.6M", age: "1d", tone: "ok" as const },
]

const BADGE_TONE = {
  ok: "bg-[rgba(29,158,117,0.12)] text-[#1D9E75]",
  warn: "bg-[rgba(201,133,46,0.12)] text-[#C9852E]",
  late: "bg-[rgba(192,57,43,0.12)] text-[#C0392B]",
}

/**
 * Plata merchant analytics — transaction overview (demo data until live APIs land).
 * Full-width layout for dashboard / admin shells.
 */
export default function PlataAnalyticsDashboard() {
  const [range, setRange] = useState<RangeKey>("30d")
  const [productFilter, setProductFilter] = useState("all")

  const trend = DEMO_TREND[range]
  const chartData = useMemo(
    () => trend.labels.map((label, i) => ({ label, value: trend.data[i] ?? 0 })),
    [trend],
  )

  const filteredMerchants =
    productFilter === "all"
      ? MERCHANTS
      : MERCHANTS.filter((m) => m.product.toLowerCase() === productFilter)

  return (
    <div className="min-h-full w-full bg-[#F7F7F5] text-[#0B1E3B] antialiased [font-variant-numeric:tabular-nums]">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 pb-16">
        {/* Top bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1E3B]">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[#C9A24B]" />
            </div>
            <div>
              <div className="text-lg font-medium">Plata analytics</div>
              <div className="text-xs text-[#5B6472]">Merchant transaction overview</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-[10px] border border-[#E4E6EA] bg-white p-[3px]">
              {(["7d", "30d", "90d"] as const).map((key) => (
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
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            >
              <option value="all">All products</option>
              <option value="mortgage">Mortgage</option>
              <option value="loan">Loan</option>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
              <option value="commodity">Commodity</option>
            </select>
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Transaction volume", value: "₦483.6M", delta: "+12.4% vs prior 30d", tone: "up" as const },
            { label: "Registered merchants", value: "1,248", delta: "+34 this month", tone: "up" as const },
            { label: "Active merchants", value: "812", delta: "65% of registered", tone: "muted" as const },
            { label: "Volume per merchant", value: "₦595.6K", delta: "Avg, active merchants", tone: "muted" as const },
            { label: "Pending transactions", value: "156", delta: "₦98.3M awaiting settlement", tone: "warn" as const },
            { label: "Success rate", value: "96.8%", delta: "3.2% failed or reversed", tone: "muted" as const },
          ].map((kpi) => (
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

        {/* Trend chart */}
        <div className="mb-8 rounded-xl border border-[#E4E6EA] bg-white p-6">
          <p className="mb-4 text-lg font-medium">{trend.caption}</p>
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
                  width={40}
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
                  formatter={(value: number | string) => [`₦${value}M`, "Volume"]}
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
        </div>

        {/* Product pillars */}
        <div className="mb-8 rounded-xl border border-[#E4E6EA] bg-white p-6">
          <p className="mb-4 text-lg font-medium">Transactions by product type</p>
          <div className="space-y-4">
            {PILLARS.map((p) => (
              <div key={p.name}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                    {p.name}
                  </span>
                  <span className="text-[#5B6472]">{p.meta}</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-[#F7F7F5]">
                  <div className="h-full rounded" style={{ width: p.width, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Merchant table */}
        <div className="mb-8 overflow-x-auto rounded-xl border border-[#E4E6EA] bg-white p-6">
          <p className="mb-4 text-lg font-medium">Volume per merchant, top accounts</p>
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                {["Merchant", "Product", "Volume", "Txns", "Avg. ticket", "Status"].map((h, i) => (
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
              {filteredMerchants.map((row) => (
                <tr key={row.name}>
                  <td className="border-b border-[#E4E6EA] px-3 py-3.5">{row.name}</td>
                  <td className="border-b border-[#E4E6EA] px-3 py-3.5">{row.product}</td>
                  <td className="border-b border-[#E4E6EA] px-3 py-3.5 text-right">{row.volume}</td>
                  <td className="border-b border-[#E4E6EA] px-3 py-3.5 text-right">{row.txns}</td>
                  <td className="border-b border-[#E4E6EA] px-3 py-3.5 text-right">{row.avg}</td>
                  <td className="border-b border-[#E4E6EA] px-3 py-3.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-[3px] text-[11px] font-medium ${
                        row.active
                          ? "bg-[rgba(29,158,117,0.12)] text-[#1D9E75]"
                          : "bg-[rgba(192,57,43,0.12)] text-[#C0392B]"
                      }`}
                    >
                      {row.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pending table */}
        <div className="overflow-x-auto rounded-xl border border-[#E4E6EA] bg-white p-6">
          <p className="mb-4 text-lg font-medium">Pending transactions by product screen</p>
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
              {PENDING.map((row) => (
                <tr key={row.product}>
                  <td className="border-b border-[#E4E6EA] px-3 py-3.5 last:border-0">{row.product}</td>
                  <td className="border-b border-[#E4E6EA] px-3 py-3.5 text-right">{row.pending}</td>
                  <td className="border-b border-[#E4E6EA] px-3 py-3.5 text-right">{row.value}</td>
                  <td className="border-b border-[#E4E6EA] px-3 py-3.5">
                    <span className={`inline-block rounded-full px-2.5 py-[3px] text-[11px] font-medium ${BADGE_TONE[row.tone]}`}>
                      {row.age}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
