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
import { cn } from "@/lib/utils"

type RangeKey = "7d" | "30d" | "90d"
type ProductFilter =
  | "All products"
  | "Mortgage"
  | "Loan"
  | "Savings"
  | "Investment"
  | "Commodity"

const COLORS = {
  navy: "#0B1E3B",
  gold: "#C9A24B",
  bg: "#F7F7F5",
  surface: "#FFFFFF",
  textSecondary: "#5B6472",
  textMuted: "#9AA1AC",
  border: "#E4E6EA",
  success: "#1D9E75",
  warning: "#C9852E",
  danger: "#C0392B",
  mortgage: "#0B1E3B",
  loan: "#C9A24B",
  savings: "#1D9E75",
  investment: "#3B5BA9",
  commodity: "#C0603B",
} as const

const TREND_DATA: Record<
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

const PRODUCT_PILLARS = [
  { name: "Mortgage", color: COLORS.mortgage, volume: "₦92.1M", txns: "340 txns", pct: 19 },
  { name: "Loan", color: COLORS.loan, volume: "₦128.3M", txns: "3,110 txns", pct: 27 },
  { name: "Savings", color: COLORS.savings, volume: "₦210.4M", txns: "8,420 txns", pct: 43 },
  { name: "Investment", color: COLORS.investment, volume: "₦38.2M", txns: "1,560 txns", pct: 8 },
  { name: "Commodity", color: COLORS.commodity, volume: "₦14.6M", txns: "640 txns", pct: 3 },
] as const

const TOP_MERCHANTS = [
  {
    merchant: "Diaspora Partners UK",
    product: "Mortgage",
    volume: "₦58.0M",
    txns: "6",
    avgTicket: "₦9.7M",
    status: "active" as const,
  },
  {
    merchant: "AG Cooperative Lagos",
    product: "Savings",
    volume: "₦42.1M",
    txns: "1,204",
    avgTicket: "₦35.0K",
    status: "active" as const,
  },
  {
    merchant: "Redeemed Christian FI",
    product: "Loan",
    volume: "₦27.4M",
    txns: "210",
    avgTicket: "₦130.5K",
    status: "active" as const,
  },
  {
    merchant: "Winners Chapel Coop",
    product: "Savings",
    volume: "₦31.8M",
    txns: "890",
    avgTicket: "₦35.7K",
    status: "active" as const,
  },
  {
    merchant: "Unilag Cooperative",
    product: "Savings",
    volume: "₦19.6M",
    txns: "640",
    avgTicket: "₦30.6K",
    status: "active" as const,
  },
  {
    merchant: "Lagos Traders Union",
    product: "Commodity",
    volume: "₦4.2M",
    txns: "180",
    avgTicket: "₦23.3K",
    status: "inactive" as const,
  },
]

const PENDING_BY_PRODUCT = [
  { product: "Mortgage", pending: "12", value: "₦86.4M", oldest: "4d", tone: "late" as const },
  { product: "Loan", pending: "48", value: "₦6.1M", oldest: "1d", tone: "ok" as const },
  { product: "Savings", pending: "62", value: "₦2.8M", oldest: "6h", tone: "ok" as const },
  { product: "Investment", pending: "22", value: "₦2.4M", oldest: "2d", tone: "warn" as const },
  { product: "Commodity", pending: "12", value: "₦0.6M", oldest: "1d", tone: "ok" as const },
]

function OldestBadge({ label, tone }: { label: string; tone: "ok" | "warn" | "late" }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        tone === "ok" && "bg-[rgba(29,158,117,0.12)] text-[#1D9E75]",
        tone === "warn" && "bg-[rgba(201,133,46,0.12)] text-[#C9852E]",
        tone === "late" && "bg-[rgba(192,57,43,0.12)] text-[#C0392B]",
      )}
    >
      {label}
    </span>
  )
}

export default function PlataAnalyticsDashboard() {
  const [range, setRange] = useState<RangeKey>("30d")
  const [productFilter, setProductFilter] = useState<ProductFilter>("All products")

  const trend = TREND_DATA[range]
  const chartRows = useMemo(
    () =>
      trend.labels.map((label, index) => ({
        label,
        volume: trend.data[index] ?? 0,
      })),
    [trend],
  )

  const filteredMerchants =
    productFilter === "All products"
      ? TOP_MERCHANTS
      : TOP_MERCHANTS.filter((row) => row.product === productFilter)

  const filteredPillars =
    productFilter === "All products"
      ? PRODUCT_PILLARS
      : PRODUCT_PILLARS.filter((row) => row.name === productFilter)

  const filteredPending =
    productFilter === "All products"
      ? PENDING_BY_PRODUCT
      : PENDING_BY_PRODUCT.filter((row) => row.product === productFilter)

  return (
    <div className="min-h-full tabular-nums" style={{ background: COLORS.bg, color: COLORS.navy }}>
      <div className="w-full px-4 py-6 pb-16 sm:px-6 sm:py-8 lg:px-8">
        {/* Top bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: COLORS.navy }}
            >
              <span
                className="block h-2.5 w-2.5 rounded-[3px]"
                style={{ background: COLORS.gold }}
              />
            </div>
            <div>
              <p className="text-lg font-medium" style={{ color: COLORS.navy }}>
                Plata analytics
              </p>
              <p className="text-xs" style={{ color: COLORS.textSecondary }}>
                Merchant transaction overview
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex rounded-[10px] border p-0.5"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}
            >
              {(["7d", "30d", "90d"] as RangeKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  className={cn(
                    "rounded-[7px] px-4 py-1.5 text-[13px] font-medium transition-colors",
                    range === key ? "text-white" : "hover:bg-black/[0.03]",
                  )}
                  style={{
                    background: range === key ? COLORS.navy : "transparent",
                    color: range === key ? "#FFFFFF" : COLORS.textSecondary,
                  }}
                >
                  {key}
                </button>
              ))}
            </div>

            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value as ProductFilter)}
              className="min-w-[170px] rounded-[10px] border px-3.5 py-2 text-[13px] outline-none"
              style={{
                background: COLORS.surface,
                borderColor: COLORS.border,
                color: COLORS.navy,
              }}
            >
              {(
                [
                  "All products",
                  "Mortgage",
                  "Loan",
                  "Savings",
                  "Investment",
                  "Commodity",
                ] as ProductFilter[]
              ).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Transaction volume",
              value: "₦483.6M",
              delta: "+12.4% vs prior 30d",
              deltaTone: "up" as const,
            },
            {
              label: "Registered merchants",
              value: "1,248",
              delta: "+34 this month",
              deltaTone: "up" as const,
            },
            {
              label: "Active merchants",
              value: "812",
              delta: "65% of registered",
              deltaTone: "muted" as const,
            },
            {
              label: "Volume per merchant",
              value: "₦595.6K",
              delta: "Avg, active merchants",
              deltaTone: "muted" as const,
            },
            {
              label: "Pending transactions",
              value: "156",
              delta: "₦98.3M awaiting settlement",
              deltaTone: "warn" as const,
            },
            {
              label: "Success rate",
              value: "96.8%",
              delta: "3.2% failed or reversed",
              deltaTone: "muted" as const,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border px-5 py-5 sm:px-6"
              style={{ background: COLORS.surface, borderColor: COLORS.border }}
            >
              <p
                className="mb-2.5 flex items-center gap-1.5 text-[13px] font-normal uppercase tracking-[0.02em]"
                style={{ color: COLORS.textSecondary }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: COLORS.gold }}
                />
                {kpi.label}
              </p>
              <p className="text-[22px] font-semibold sm:text-[26px]" style={{ color: COLORS.navy }}>
                {kpi.value}
              </p>
              <p
                className="mt-2 text-xs"
                style={{
                  color:
                    kpi.deltaTone === "up"
                      ? COLORS.success
                      : kpi.deltaTone === "warn"
                        ? COLORS.warning
                        : COLORS.textSecondary,
                }}
              >
                {kpi.delta}
              </p>
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <section
          className="mb-8 rounded-xl border p-5 sm:p-6"
          style={{ background: COLORS.surface, borderColor: COLORS.border }}
        >
          <h2 className="mb-4 text-lg font-medium" style={{ color: COLORS.navy }}>
            {trend.caption}
          </h2>
          <div className="h-[200px] w-full min-w-0 sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="plataVolumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={COLORS.gold} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={COLORS.border} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                  width={36}
                />
                <Tooltip
                  cursor={{ stroke: COLORS.border }}
                  contentStyle={{
                    background: COLORS.navy,
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 12,
                    padding: "8px 12px",
                  }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value: number) => [`₦${value}M`, "Volume"]}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke={COLORS.navy}
                  strokeWidth={2}
                  fill="url(#plataVolumeFill)"
                  dot={{ r: 3, fill: COLORS.gold, stroke: COLORS.navy, strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Product pillars */}
        <section
          className="mb-8 rounded-xl border p-5 sm:p-6"
          style={{ background: COLORS.surface, borderColor: COLORS.border }}
        >
          <h2 className="mb-4 text-lg font-medium" style={{ color: COLORS.navy }}>
            Transactions by product type
          </h2>
          <div className="space-y-4">
            {filteredPillars.map((pillar) => (
              <div key={pillar.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium" style={{ color: COLORS.navy }}>
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-[3px]"
                      style={{ background: pillar.color }}
                    />
                    {pillar.name}
                  </span>
                  <span style={{ color: COLORS.textSecondary }}>
                    {pillar.volume} · {pillar.txns} · {pillar.pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded" style={{ background: COLORS.bg }}>
                  <div
                    className="h-full rounded"
                    style={{ width: `${pillar.pct}%`, background: pillar.color }}
                  />
                </div>
              </div>
            ))}
            {filteredPillars.length === 0 ? (
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                No product data for this filter.
              </p>
            ) : null}
          </div>
        </section>

        {/* Top merchants */}
        <section
          className="mb-8 overflow-x-auto rounded-xl border p-5 sm:p-6"
          style={{ background: COLORS.surface, borderColor: COLORS.border }}
        >
          <h2 className="mb-4 text-lg font-medium" style={{ color: COLORS.navy }}>
            Volume per merchant, top accounts
          </h2>
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                {["Merchant", "Product", "Volume", "Txns", "Avg. ticket", "Status"].map(
                  (heading, index) => (
                    <th
                      key={heading}
                      className={cn(
                        "border-b px-3 pb-2.5 text-left text-xs font-medium uppercase tracking-[0.02em]",
                        index >= 2 && index <= 4 && "text-right",
                      )}
                      style={{ borderColor: COLORS.border, color: COLORS.textSecondary }}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredMerchants.map((row) => (
                <tr key={row.merchant}>
                  <td
                    className="border-b px-3 py-3.5"
                    style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  >
                    {row.merchant}
                  </td>
                  <td
                    className="border-b px-3 py-3.5"
                    style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  >
                    {row.product}
                  </td>
                  <td
                    className="border-b px-3 py-3.5 text-right"
                    style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  >
                    {row.volume}
                  </td>
                  <td
                    className="border-b px-3 py-3.5 text-right"
                    style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  >
                    {row.txns}
                  </td>
                  <td
                    className="border-b px-3 py-3.5 text-right"
                    style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  >
                    {row.avgTicket}
                  </td>
                  <td className="border-b px-3 py-3.5" style={{ borderColor: COLORS.border }}>
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        row.status === "active"
                          ? "bg-[rgba(29,158,117,0.12)] text-[#1D9E75]"
                          : "bg-[rgba(192,57,43,0.12)] text-[#C0392B]",
                      )}
                    >
                      {row.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredMerchants.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm"
                    style={{ color: COLORS.textSecondary }}
                  >
                    No merchants for this product filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        {/* Pending by product */}
        <section
          className="overflow-x-auto rounded-xl border p-5 sm:p-6"
          style={{ background: COLORS.surface, borderColor: COLORS.border }}
        >
          <h2 className="mb-4 text-lg font-medium" style={{ color: COLORS.navy }}>
            Pending transactions by product screen
          </h2>
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr>
                {["Product", "Pending", "Value", "Oldest"].map((heading, index) => (
                  <th
                    key={heading}
                    className={cn(
                      "border-b px-3 pb-2.5 text-left text-xs font-medium uppercase tracking-[0.02em]",
                      (index === 1 || index === 2) && "text-right",
                    )}
                    style={{ borderColor: COLORS.border, color: COLORS.textSecondary }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPending.map((row) => (
                <tr key={row.product}>
                  <td
                    className="border-b px-3 py-3.5"
                    style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  >
                    {row.product}
                  </td>
                  <td
                    className="border-b px-3 py-3.5 text-right"
                    style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  >
                    {row.pending}
                  </td>
                  <td
                    className="border-b px-3 py-3.5 text-right"
                    style={{ borderColor: COLORS.border, color: COLORS.navy }}
                  >
                    {row.value}
                  </td>
                  <td className="border-b px-3 py-3.5" style={{ borderColor: COLORS.border }}>
                    <OldestBadge label={row.oldest} tone={row.tone} />
                  </td>
                </tr>
              ))}
              {filteredPending.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-sm"
                    style={{ color: COLORS.textSecondary }}
                  >
                    No pending rows for this product filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
