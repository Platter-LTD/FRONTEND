"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Banknote,
  Home,
  Package,
  PiggyBank,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { productApi } from "@/lib/services/product-api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import {
  appendPortfolioAccountRows,
  categoryCountForTab,
  mapByTypeToView,
  mapPortfolioAccountsFromData,
  moneyMajor,
  tabKeyToApiType,
  unwrapApiData,
  withPortfolioAccountsTable,
  type ByTypeOverviewData,
  type OverviewByTypeView,
  type ProductOverviewData,
  type ProductOverviewTabKey,
} from "@/lib/productOverview"

/* -------------------------------------------------------------------------- */
/*  Theme                                                                      */
/* -------------------------------------------------------------------------- */

const CARD = "rounded-xl border border-[#E7E5E0] bg-white"
const HEADING = "text-base font-medium text-[#1C1917]"
const APPROVE_BUTTON =
  "rounded-lg bg-[#B08D57] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#96723F]"
const OUTLINE_BUTTON =
  "rounded-lg border border-[#E7E5E0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#78716C] transition-colors hover:bg-[#FAFAF9]"
const REVIEW_BUTTON =
  "rounded-lg border border-[#E7E5E0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#96723F] transition-colors hover:bg-[#F7EEDD]"

type Tone = "success" | "muted" | "warning" | "danger" | "gold" | "info"

const TONE_DOT: Record<Tone, string> = {
  success: "bg-[#1D9E75]",
  muted: "bg-[#A8A29E]",
  warning: "bg-[#C9852E]",
  danger: "bg-[#C0392B]",
  gold: "bg-[#B08D57]",
  info: "bg-[#2563EB]",
}

const TONE_NOTE: Record<Tone, string> = {
  success: "text-[#157F5E]",
  muted: "text-[#78716C]",
  warning: "text-[#A9701F]",
  danger: "text-[#B3372C]",
  gold: "text-[#96723F]",
  info: "text-[#1D4ED8]",
}

const TONE_BADGE: Record<Tone, string> = {
  success: "bg-[rgba(29,158,117,0.12)] text-[#157F5E]",
  muted: "bg-[rgba(120,113,108,0.12)] text-[#57534E]",
  warning: "bg-[rgba(201,133,46,0.14)] text-[#A9701F]",
  danger: "bg-[rgba(192,57,43,0.12)] text-[#B3372C]",
  gold: "bg-[#F7EEDD] text-[#96723F]",
  info: "bg-[rgba(37,99,235,0.12)] text-[#1D4ED8]",
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type TabKey = "loan" | "mortgage" | "savings" | "investment" | "commodity"

type Column = { label: string; align?: "right" }
type Cell = string | { badge: string; tone: Tone }

type TableSpec = {
  id: string
  title: string
  description?: string
  columns: Column[]
  rows: Cell[][]
}

type KpiSpec = {
  id: string
  label: string
  value: string
  note: string
  tone: Tone
  drilldown?: TableSpec
  special?: "mortgage-savings"
  portfolioStatus?: "active" | "inactive" | "non_performing" | "bad"
}

type PortfolioFilterKey = "all" | "active" | "inactive" | "non_performing" | "bad"

type DueSpec = { label: string; note: string; amount: number }

type RequestStatus = "pending" | "approved" | "declined"

type RequestRow = {
  id: string
  reference: string
  customer: string
  detail: string
  amount: number
  requestedOn: string
  status: RequestStatus
}

type RequestTableSpec = {
  title: string
  description: string
  detailLabel: string
}

type SavingsApplication = {
  id: string
  reference: string
  customer: string
  property: string
  target: number
  monthly: number
  tenure: string
  submittedOn: string
  status: "pending" | "approved" | "declined"
}

type SavingsPlan = {
  id: string
  reference: string
  customer: string
  property: string
  saved: number
  target: number
  monthly: number
  startedOn: string
}

type MissedSavingsPlan = {
  id: string
  reference: string
  customer: string
  missed: number
  lastPaidOn: string
  monthly: number
}

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                 */
/* -------------------------------------------------------------------------- */

function money(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function count(value: number) {
  return value.toLocaleString("en-NG")
}

/* -------------------------------------------------------------------------- */
/*  Tab chrome (no mock KPIs / tables)                                         */
/* -------------------------------------------------------------------------- */

const TAB_META: {
  key: TabKey
  label: string
  icon: LucideIcon
  requests?: RequestTableSpec
}[] = [
  { key: "loan", label: "Loan", icon: Banknote },
  { key: "mortgage", label: "Mortgage", icon: Home },
  { key: "savings", label: "Savings", icon: PiggyBank, requests: {
      title: "Withdrawal request",
      description: "Approve or decline customer withdrawals.",
      detailLabel: "Plan",
    } },
  { key: "investment", label: "Investment", icon: TrendingUp, requests: {
      title: "Liquidation request",
      description: "Approve or decline early liquidations.",
      detailLabel: "Instrument",
    } },
  { key: "commodity", label: "Commodity", icon: Package, requests: {
      title: "Liquidation request",
      description: "Approve or decline commodity cash-outs.",
      detailLabel: "Commodity",
    } },
]

const PORTFOLIO_FILTERS: Array<{ value: PortfolioFilterKey; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "non_performing", label: "Non-performing" },
  { value: "bad", label: "Bad" },
]

/* -------------------------------------------------------------------------- */
/*  Presentational pieces                                                      */
/* -------------------------------------------------------------------------- */

function OverviewSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
          <TableSkeleton columnCount={6} rowCount={4} />
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

function Badge({ label, tone }: { label: string; tone: Tone }) {
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

function KpiCard({
  kpi,
  selected,
  onSelect,
}: {
  kpi: KpiSpec
  selected?: boolean
  onSelect?: () => void
}) {
  const interactive = Boolean(onSelect)
  const className = cn(
    "rounded-xl border bg-white px-5 py-4 text-left transition-colors",
    selected ? "border-[#B08D57] ring-1 ring-[#B08D57]/40" : "border-[#E7E5E0]",
    interactive && "cursor-pointer hover:border-[#B08D57]/60",
  )

  const body = (
    <>
      <span className="flex items-center gap-2 text-[13px] text-[#78716C]">
        <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[kpi.tone])} />
        {kpi.label}
      </span>
      <span className="mt-2.5 block text-[26px] font-semibold leading-none text-[#1C1917]">
        {kpi.value}
      </span>
      <span className={cn("mt-2 block text-xs", TONE_NOTE[kpi.tone])}>{kpi.note}</span>
    </>
  )

  if (interactive) {
    return (
      <button type="button" className={className} onClick={onSelect} aria-pressed={selected}>
        {body}
      </button>
    )
  }

  return <div className={className}>{body}</div>
}

function DueCallout({ due }: { due: DueSpec }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E7E5E0] bg-[#F7EEDD] px-5 py-4">
      <div>
        <p className="text-sm font-medium text-[#96723F]">{due.label}</p>
        <p className="mt-0.5 text-xs text-[#78716C]">{due.note}</p>
      </div>
      <p className="text-xl font-semibold text-[#1C1917]">{money(due.amount)}</p>
    </div>
  )
}

function TableHead({ columns }: { columns: Column[] }) {
  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <th
            key={column.label}
            className={cn(
              "border-b border-[#E7E5E0] px-3 pb-2.5 text-left text-[11px] font-medium uppercase tracking-[0.04em] text-[#A8A29E]",
              column.align === "right" && "text-right",
            )}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function DataTable({ table }: { table: TableSpec }) {
  return (
    <section className={cn(CARD, "p-5 sm:p-6")}>
      <h2 className={HEADING}>{table.title}</h2>
      {table.description ? (
        <p className="mt-1 text-sm text-[#78716C]">{table.description}</p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <TableHead columns={table.columns} />
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.id}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${table.id}-${rowIndex}-${cellIndex}`}
                    className={cn(
                      "border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]",
                      table.columns[cellIndex]?.align === "right" && "text-right",
                    )}
                  >
                    {typeof cell === "string" ? cell : <Badge label={cell.badge} tone={cell.tone} />}
                  </td>
                ))}
              </tr>
            ))}
            {table.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-3 py-8 text-center text-sm text-[#78716C]"
                >
                  Nothing to show yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const REQUEST_BADGE: Record<RequestStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  declined: { label: "Declined", tone: "danger" },
}

function RequestTable({
  spec,
  rows,
  onResolve,
}: {
  spec: RequestTableSpec
  rows: RequestRow[]
  onResolve: (id: string, next: "approved" | "declined") => void
}) {
  return (
    <section className={cn(CARD, "p-5 sm:p-6")}>
      <h2 className={HEADING}>{spec.title}</h2>
      <p className="mt-1 text-sm text-[#78716C]">{spec.description}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <TableHead
            columns={[
              { label: "Reference" },
              { label: "Customer" },
              { label: spec.detailLabel },
              { label: "Amount", align: "right" },
              { label: "Requested on" },
              { label: "Status" },
              { label: "Action", align: "right" },
            ]}
          />
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                  {row.reference}
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                  {row.customer}
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                  {row.detail}
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-right text-[#1C1917]">
                  {money(row.amount)}
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-[#1C1917]">
                  {row.requestedOn}
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5">
                  <Badge
                    label={REQUEST_BADGE[row.status].label}
                    tone={REQUEST_BADGE[row.status].tone}
                  />
                </td>
                <td className="border-b border-[#E7E5E0] px-3 py-3.5 text-right">
                  {row.status === "pending" ? (
                    <span className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={APPROVE_BUTTON}
                        onClick={() => onResolve(row.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={OUTLINE_BUTTON}
                        onClick={() => onResolve(row.id, "declined")}
                      >
                        Decline
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-[#A8A29E]">No action needed</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-[#78716C]">
                  Nothing to review right now.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Mortgage savings panel                                                     */
/* -------------------------------------------------------------------------- */

type SavingsPanelTab = "pending" | "running" | "non-performing"

const SAVINGS_PANEL_TABS: { key: SavingsPanelTab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "running", label: "Running" },
  { key: "non-performing", label: "Non-performing" },
]

function MortgageSavingsPanel({
  appName,
  applications,
  plans,
  missed,
  remindersSent,
  onReview,
  onSendReminder,
}: {
  appName?: string
  applications: SavingsApplication[]
  plans: SavingsPlan[]
  missed: MissedSavingsPlan[]
  remindersSent: Record<string, boolean>
  onReview: (application: SavingsApplication) => void
  onSendReminder: (plan: MissedSavingsPlan) => void
}) {
  const [panelTab, setPanelTab] = useState<SavingsPanelTab>("pending")
  const pending = applications.filter((application) => application.status === "pending")

  const counts: Record<SavingsPanelTab, number> = {
    pending: pending.length,
    running: plans.length,
    "non-performing": missed.length,
  }

  return (
    <section className={cn(CARD, "mt-4 p-5 sm:p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={HEADING}>Mortgage savings</h2>
          <p className="mt-1 text-sm text-[#78716C]">
            Customers saving towards a down payment on {appName || "your app"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-[#E7E5E0] bg-[#FAFAF9] p-1">
          {SAVINGS_PANEL_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPanelTab(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                panelTab === tab.key
                  ? "bg-white text-[#96723F] shadow-sm"
                  : "text-[#78716C] hover:text-[#1C1917]",
              )}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {panelTab === "pending" ? (
          pending.length === 0 ? (
            <InlineEmptyState message="No application is waiting for review." />
          ) : (
            pending.map((application) => (
              <div
                key={application.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E7E5E0] bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1917]">{application.customer}</p>
                  <p className="mt-0.5 text-xs text-[#78716C]">
                    {application.reference} · {application.property}
                  </p>
                  <p className="mt-1.5 text-xs text-[#78716C]">
                    Target {money(application.target)} · Monthly {money(application.monthly)} ·{" "}
                    {application.tenure} · Requested {application.submittedOn}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge label="Pending review" tone="warning" />
                  <button
                    type="button"
                    className={REVIEW_BUTTON}
                    onClick={() => onReview(application)}
                  >
                    Review
                  </button>
                </div>
              </div>
            ))
          )
        ) : null}

        {panelTab === "running" ? (
          plans.length === 0 ? (
            <InlineEmptyState message="No savings plan is running yet." />
          ) : (
            plans.map((plan) => {
              const percent = Math.min(100, Math.round((plan.saved / plan.target) * 100))
              return (
                <div
                  key={plan.id}
                  className="rounded-xl border border-[#E7E5E0] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1C1917]">{plan.customer}</p>
                      <p className="mt-0.5 text-xs text-[#78716C]">
                        {plan.reference} · {plan.property}
                      </p>
                    </div>
                    <p className="text-sm text-[#1C1917]">
                      {money(plan.saved)}{" "}
                      <span className="text-[#78716C]">of {money(plan.target)}</span>
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F5F5F4]">
                    <div
                      className="h-full rounded-full bg-[#B08D57]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#78716C]">
                    {percent}% funded · Monthly {money(plan.monthly)} · Started {plan.startedOn}
                  </p>
                </div>
              )
            })
          )
        ) : null}

        {panelTab === "non-performing" ? (
          missed.length === 0 ? (
            <InlineEmptyState message="Every savings plan is on schedule." />
          ) : (
            missed.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E7E5E0] bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1917]">{plan.customer}</p>
                  <p className="mt-0.5 text-xs text-[#78716C]">{plan.reference}</p>
                  <p className="mt-1.5 text-xs text-[#78716C]">
                    {plan.missed} missed contributions · Last paid {plan.lastPaidOn} · Monthly{" "}
                    {money(plan.monthly)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge label="Non-performing" tone="warning" />
                  {remindersSent[plan.id] ? (
                    <span className="text-xs font-medium text-[#157F5E]">Reminder sent</span>
                  ) : (
                    <button
                      type="button"
                      className={OUTLINE_BUTTON}
                      onClick={() => onSendReminder(plan)}
                    >
                      Send reminder
                    </button>
                  )}
                </div>
              </div>
            ))
          )
        ) : null}
      </div>
    </section>
  )
}

function InlineEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#E7E5E0] bg-[#FAFAF9] px-4 py-10 text-center text-sm text-[#78716C]">
      {message}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Review modal                                                               */
/* -------------------------------------------------------------------------- */

function ReviewModal({
  application,
  onClose,
  onApprove,
  onDecline,
}: {
  application: SavingsApplication
  onClose: () => void
  onApprove: () => void
  onDecline: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const details: { label: string; value: string }[] = [
    { label: "Reference", value: application.reference },
    { label: "Customer", value: application.customer },
    { label: "Target property", value: application.property },
    { label: "Target amount", value: money(application.target) },
    { label: "Monthly contribution", value: money(application.monthly) },
    { label: "Tenure", value: application.tenure },
    { label: "Submitted on", value: application.submittedOn },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Review mortgage savings application"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#E7E5E0] bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-medium text-[#1C1917]">Review application</h2>
            <p className="mt-1 text-sm text-[#78716C]">
              Confirm the details before you create a savings plan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="rounded-lg border border-[#E7E5E0] p-1.5 text-[#78716C] transition-colors hover:bg-[#FAFAF9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-5 space-y-3">
          {details.map((detail) => (
            <div key={detail.label} className="flex items-start justify-between gap-4 text-sm">
              <dt className="text-[#78716C]">{detail.label}</dt>
              <dd className="text-right font-medium text-[#1C1917]">{detail.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-[#E7E5E0] pt-4">
          <button
            type="button"
            className="rounded-lg border border-[#E7E5E0] bg-white px-4 py-2 text-sm font-medium text-[#78716C] transition-colors hover:bg-[#FAFAF9]"
            onClick={onDecline}
          >
            Decline
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#B08D57] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#96723F]"
            onClick={onApprove}
          >
            Approve &amp; create plan
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function ProductOverviewDashboard({
  appId,
  appName,
}: {
  appId?: string
  appName?: string
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("loan")
  const [portfolioFilter, setPortfolioFilter] = useState<PortfolioFilterKey>("all")

  const [overview, setOverview] = useState<ProductOverviewData | null>(null)
  const [liveView, setLiveView] = useState<OverviewByTypeView | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(Boolean(appId))
  const [loadingType, setLoadingType] = useState(Boolean(appId))
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingMoreAccounts, setLoadingMoreAccounts] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [typeError, setTypeError] = useState<string | null>(null)
  /** Unfiltered by-type shell (KPIs + default accounts) cached per tab. */
  const kpiCache = useRef<Partial<Record<TabKey, OverviewByTypeView>>>({})
  const ACCOUNTS_PAGE_SIZE = 50
  const showPortfolioFilter = activeTab === "loan" || activeTab === "mortgage"

  const tabMeta = useMemo(
    () => TAB_META.find((entry) => entry.key === activeTab) ?? TAB_META[0],
    [activeTab],
  )

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
        setOverview(unwrapApiData<ProductOverviewData>(res))
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

  // Load by-type once per tab for KPI cards (and default accounts when filter is all).
  useEffect(() => {
    if (!appId) {
      setLoadingType(false)
      setLiveView(null)
      return
    }

    const ac = new AbortController()
    setLoadingType(true)
    setTypeError(null)
    setLiveView(null)

    const apiType = tabKeyToApiType(activeTab as ProductOverviewTabKey)
    const opts = showPortfolioFilter
      ? { portfolioStatus: "all" as const, limit: ACCOUNTS_PAGE_SIZE, skip: 0 }
      : undefined

    void productApi
      .getProductOverviewByType(appId, apiType, ac.signal, opts)
      .then((res) => {
        try {
          const mapped = mapByTypeToView(unwrapApiData<ByTypeOverviewData>(res))
          kpiCache.current[activeTab] = mapped
          // If user already clicked a status before this resolved, filter effect will overlay accounts.
          setLiveView((prev) => {
            if (showPortfolioFilter && portfolioFilter !== "all" && prev) {
              return withPortfolioAccountsTable(
                mapped,
                prev.tables.find((t) => t.id.endsWith("-accounts")) ?? null,
                prev.portfolioAccountsMeta,
              )
            }
            return mapped
          })
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Could not read this product type"
          setTypeError(msg)
          setLiveView(null)
        }
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        const msg = err instanceof Error ? err.message : "Failed to load this product type"
        setTypeError(msg)
        toast.error(msg)
        setLiveView(null)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingType(false)
      })
    return () => ac.abort()
    // portfolioFilter intentionally omitted — KPIs load once per tab; status clicks only refetch accounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, activeTab, showPortfolioFilter])

  // Drop cached by-type shells when the app changes.
  useEffect(() => {
    kpiCache.current = {}
  }, [appId])

  // On status card/dropdown change: refetch accounts with ?portfolioStatus=
  useEffect(() => {
    if (!appId || !showPortfolioFilter) return

    if (portfolioFilter === "all") {
      const cached = kpiCache.current[activeTab]
      if (cached) {
        setLiveView(cached)
        setLoadingAccounts(false)
      }
      return
    }

    const ac = new AbortController()
    setLoadingAccounts(true)
    const apiType = tabKeyToApiType(activeTab as ProductOverviewTabKey)

    void productApi
      .getProductOverviewByType(appId, apiType, ac.signal, {
        portfolioStatus: portfolioFilter,
        limit: ACCOUNTS_PAGE_SIZE,
        skip: 0,
      })
      .then((res) => {
        const payload = unwrapApiData<ByTypeOverviewData>(res)
        const { table, meta } = mapPortfolioAccountsFromData(payload)
        const base = kpiCache.current[activeTab]
        if (base) {
          setLiveView(withPortfolioAccountsTable(base, table, meta))
        } else {
          // KPI shell not ready yet — map full response so UI still works.
          setLiveView(mapByTypeToView(payload))
        }
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        const msg = err instanceof Error ? err.message : "Failed to filter portfolio accounts"
        toast.error(msg)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingAccounts(false)
      })

    return () => ac.abort()
  }, [appId, activeTab, portfolioFilter, showPortfolioFilter])

  const kpis: KpiSpec[] = useMemo(() => {
    if (!liveView) return []
    return liveView.kpis.map((kpi) =>
      kpi.special === "mortgage-savings"
        ? {
            ...kpi,
            value: count(liveView.mortgageSavingsPending ?? 0),
            note: `${count(liveView.mortgageSavingsPending ?? 0)} pending review · ${count(liveView.mortgageSavingsRunning ?? 0)} running`,
          }
        : (kpi as KpiSpec),
    )
  }, [liveView])

  const tabRequests = liveView?.requests ?? []
  const tabTables = (liveView?.tables as TableSpec[] | undefined) ?? []
  const tabDue = liveView?.due
  const headline = overview?.headline
  const showSkeleton = loadingOverview || (loadingType && !liveView)
  const accountsRefreshing = (loadingAccounts || loadingType) && Boolean(liveView) && showPortfolioFilter
  const hasTypeData = Boolean(liveView && (kpis.length || tabTables.length || tabRequests.length || tabDue))
  const accountsMeta = liveView?.portfolioAccountsMeta
  const canLoadMoreAccounts =
    showPortfolioFilter && Boolean(accountsMeta?.hasMore) && !loadingMoreAccounts && !loadingAccounts

  async function loadMoreAccounts() {
    if (!appId || !showPortfolioFilter || !liveView || !accountsMeta?.hasMore) return
    const skip = (accountsMeta.skip ?? 0) + (accountsMeta.limit ?? ACCOUNTS_PAGE_SIZE)
    const apiType = tabKeyToApiType(activeTab as ProductOverviewTabKey)
    setLoadingMoreAccounts(true)
    try {
      const res = await productApi.getProductOverviewByType(appId, apiType, undefined, {
        portfolioStatus: portfolioFilter,
        limit: accountsMeta.limit ?? ACCOUNTS_PAGE_SIZE,
        skip,
      })
      const payload = unwrapApiData<ByTypeOverviewData>(res)
      const { table, meta } = mapPortfolioAccountsFromData(payload)
      if (!table) return
      setLiveView((prev) => (prev ? appendPortfolioAccountRows(prev, table, meta) : prev))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load more accounts")
    } finally {
      setLoadingMoreAccounts(false)
    }
  }

  function handleTabChange(next: TabKey) {
    if (next === activeTab) return
    setActiveTab(next)
    setTypeError(null)
    setPortfolioFilter("all")
    setLiveView(null)
  }

  function handlePortfolioFilterChange(next: PortfolioFilterKey) {
    setPortfolioFilter(next)
  }

  function handleKpiClick(kpi: KpiSpec) {
    if (!showPortfolioFilter || !kpi.portfolioStatus) return
    setPortfolioFilter((prev) => (prev === kpi.portfolioStatus ? "all" : kpi.portfolioStatus!))
  }

  function resolveRequest(id: string, next: "approved" | "declined") {
    const row = tabRequests.find((entry) => entry.id === id)
    if (!liveView) return
    const updated: OverviewByTypeView = {
      ...liveView,
      requests: liveView.requests.map((entry) =>
        entry.id === id ? { ...entry, status: next } : entry,
      ),
    }
    kpiCache.current[activeTab] = updated
    setLiveView(updated)
    const description = row ? `${row.reference} · ${money(row.amount)}` : undefined
    if (next === "approved") toast.success("Request approved", { description })
    else toast.info("Request declined", { description })
  }

  return (
    <div className="min-h-full w-full bg-[#FAFAF9] text-[#1C1917] tabular-nums">
      <div className="w-full px-6 pb-16 pt-5 sm:px-8">
        <header>
          <h1 className="text-2xl font-semibold text-[#1C1917]">Product overview</h1>
          <p className="mt-1.5 text-sm text-[#78716C]">
            Live activity across every product type {appName || "your app"} has published on Plata.
          </p>
        </header>

        {loadingOverview ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`${CARD} px-4 py-3`}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-5 w-20" />
              </div>
            ))}
          </div>
        ) : headline ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Requested", value: moneyMajor(headline.requestedAmount) },
              { label: "Approved", value: moneyMajor(headline.approvedAmount) },
              { label: "Lending apps", value: count(headline.lendingApplicationsRequestedCount ?? 0) },
              { label: "Approved apps", value: count(headline.lendingApplicationsApprovedCount ?? 0) },
              { label: "Transactions", value: count(headline.totalTransactions ?? 0) },
              { label: "Interest", value: moneyMajor(headline.totalInterest) },
            ].map((item) => (
              <div key={item.label} className={`${CARD} px-4 py-3`}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#78716C]">{item.label}</p>
                <p className="mt-1 text-base font-semibold text-[#1C1917]">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {overviewError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {overviewError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2" aria-label="Product type">
            {TAB_META.map((entry) => {
              const Icon = entry.icon
              const isActive = entry.key === activeTab
              const configured = overview
                ? categoryCountForTab(overview.byCategory, entry.key as ProductOverviewTabKey)
                : undefined
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => handleTabChange(entry.key)}
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

          {showPortfolioFilter ? (
            <Select
              value={portfolioFilter}
              onValueChange={(value) => handlePortfolioFilterChange(value as PortfolioFilterKey)}
            >
              <SelectTrigger className="h-10 min-w-[190px] rounded-full border-[#E7E5E0] bg-white px-4 text-sm text-[#57534E]">
                <SelectValue placeholder="Filter overview" />
              </SelectTrigger>
              <SelectContent>
                {PORTFOLIO_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {showSkeleton ? (
          <OverviewSkeleton />
        ) : typeError ? (
          <EmptyState
            title={`Couldn’t load ${tabMeta.label.toLowerCase()} overview`}
            description={typeError}
          />
        ) : !hasTypeData ? (
          <EmptyState
            title={`No ${tabMeta.label.toLowerCase()} activity yet`}
            description={`When ${tabMeta.label.toLowerCase()} products start running on this app, KPIs and tables will show here.`}
          />
        ) : (
          <>
            {kpis.length ? (
              <div
                className={cn(
                  "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2",
                  kpis.length > 4 ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4",
                )}
              >
                {kpis.map((kpi) => (
                  <KpiCard
                    key={kpi.id}
                    kpi={kpi}
                    selected={Boolean(kpi.portfolioStatus && portfolioFilter === kpi.portfolioStatus)}
                    onSelect={
                      showPortfolioFilter && kpi.portfolioStatus
                        ? () => handleKpiClick(kpi)
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : null}

            {tabDue ? <DueCallout due={tabDue} /> : null}

            {accountsRefreshing ? (
              <p className="mt-3 text-xs text-[#78716C]">Updating portfolio accounts…</p>
            ) : null}

            <div className={cn("mt-4 space-y-4", accountsRefreshing && "opacity-60")}>
              {tabTables.length === 0 && !tabMeta.requests ? (
                <EmptyState
                  title="Nothing to show"
                  description="No product rows or requests for this type yet."
                />
              ) : null}
              {tabTables.map((table) => (
                <DataTable key={table.id} table={table} />
              ))}
              {canLoadMoreAccounts ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    className={OUTLINE_BUTTON}
                    disabled={loadingMoreAccounts}
                    onClick={() => void loadMoreAccounts()}
                  >
                    {loadingMoreAccounts ? "Loading…" : "Load more accounts"}
                  </button>
                </div>
              ) : null}
              {tabMeta.requests ? (
                <RequestTable spec={tabMeta.requests} rows={tabRequests} onResolve={resolveRequest} />
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

