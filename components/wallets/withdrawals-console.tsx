"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Info, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { formatPlataWalletAmount } from "@/lib/walletDisplay"
import {
  treasuryConsoleApi,
  type SettlementMode,
  type SettlementType,
  type TreasuryPayoutRow,
  type WithdrawalHistoryStatus,
} from "@/lib/services/treasuryConsoleService"
import { usePermissions } from "@/hooks/usePermissions"

type TabKey = "withdrawals" | SettlementType
type HistoryFilter = Exclude<WithdrawalHistoryStatus, "all">

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "withdrawals", label: "Withdrawal Requests" },
  { key: "investments", label: "Matured Investments" },
  { key: "commodities", label: "Matured Commodities" },
  { key: "savings", label: "Matured Savings" },
]

const SETTLEMENT_META: Record<
  SettlementType,
  { title: string; note: string }
> = {
  investments: {
    title: "Matured Investments",
    note: "Investment products that have reached their maturity date and are due a return.",
  },
  commodities: {
    title: "Matured Commodities",
    note: "Commodity purchases that have reached their maturity/payout date.",
  },
  savings: {
    title: "Matured Savings",
    note: "Savings plans that have completed their full term and are due for release into the customer's main wallet.",
  },
}

function formatShortDate(value?: string): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase()
  const paid = s === "paid" || s === "approved" || s === "completed"
  const failed = s === "failed" || s === "blocked" || s === "rejected"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
        paid && "bg-[#ECFDF3] text-[#067647]",
        failed && "bg-[#FEE4E2] text-[#B42318]",
        !paid && !failed && "bg-[#FEF3DC] text-[#92610A]",
      )}
    >
      {paid ? (s === "approved" ? "Approved" : "Paid") : failed ? (s === "rejected" ? "Rejected" : "Failed") : "Pending"}
    </span>
  )
}

function BatchToast(result: {
  paidCount: number
  blockedCount: number
  noun: string
}) {
  if (result.blockedCount === 0) {
    toast.success(`${result.paidCount} ${result.noun} approved and paid from Treasury`)
    return
  }
  toast.message(
    `${result.paidCount} paid, ${result.blockedCount} could not be paid — insufficient Treasury balance`,
  )
}

type Props = { appId: string }

export function WithdrawalsConsole({ appId }: Props) {
  const { can } = usePermissions()
  const canApprovePayout = can("approve_payout")
  const canSetAutoSettle = can(["approve_payout", "manage_system_settings"])

  const [tab, setTab] = useState<TabKey>("withdrawals")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  const [withdrawals, setWithdrawals] = useState<TreasuryPayoutRow[]>([])
  const [wdSelected, setWdSelected] = useState<Set<string>>(new Set())
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("approved")
  const [historyRows, setHistoryRows] = useState<TreasuryPayoutRow[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const [settlements, setSettlements] = useState<Record<SettlementType, TreasuryPayoutRow[]>>({
    investments: [],
    commodities: [],
    savings: [],
  })
  const [modes, setModes] = useState<Record<SettlementType, SettlementMode>>({
    investments: "manual",
    commodities: "manual",
    savings: "manual",
  })
  const [reverted, setReverted] = useState<Record<SettlementType, boolean>>({
    investments: false,
    commodities: false,
    savings: false,
  })
  const [settleSelected, setSettleSelected] = useState<Record<SettlementType, Set<string>>>({
    investments: new Set(),
    commodities: new Set(),
    savings: new Set(),
  })
  const [settleHistoryFilter, setSettleHistoryFilter] = useState<HistoryFilter>("approved")
  const [settleHistoryRows, setSettleHistoryRows] = useState<TreasuryPayoutRow[]>([])
  const [settleHistoryTotal, setSettleHistoryTotal] = useState(0)
  const [settleHistoryLoading, setSettleHistoryLoading] = useState(false)
  const [settleHistoryError, setSettleHistoryError] = useState<string | null>(null)

  const loadHistory = useCallback(
    async (status: HistoryFilter) => {
      if (!appId) return
      setHistoryLoading(true)
      setHistoryError(null)
      const res = await treasuryConsoleApi.listWithdrawalsHistory(appId, {
        status,
        limit: 50,
        skip: 0,
      })
      if (!res.success) {
        setHistoryRows([])
        setHistoryTotal(0)
        setHistoryError(res.error)
        setHistoryLoading(false)
        return
      }
      setHistoryRows(res.data?.items ?? [])
      setHistoryTotal(res.data?.pagination.total ?? res.data?.items.length ?? 0)
      setHistoryLoading(false)
    },
    [appId],
  )

  const loadSettleHistory = useCallback(
    async (type: SettlementType, status: HistoryFilter) => {
      if (!appId) return
      setSettleHistoryLoading(true)
      setSettleHistoryError(null)
      const res = await treasuryConsoleApi.listSettlementsHistory(appId, type, {
        status,
        limit: 50,
        skip: 0,
      })
      if (!res.success) {
        setSettleHistoryRows([])
        setSettleHistoryTotal(0)
        setSettleHistoryError(res.error)
        setSettleHistoryLoading(false)
        return
      }
      setSettleHistoryRows(res.data?.items ?? [])
      setSettleHistoryTotal(res.data?.pagination.total ?? res.data?.items.length ?? 0)
      setSettleHistoryLoading(false)
    },
    [appId],
  )

  const refresh = useCallback(async () => {
    if (!appId) return
    setLoading(true)
    setError(null)
    const [wd, inv, com, sav, invMode, comMode, savMode] = await Promise.all([
      treasuryConsoleApi.listWithdrawals(appId),
      treasuryConsoleApi.listSettlements(appId, "investments"),
      treasuryConsoleApi.listSettlements(appId, "commodities"),
      treasuryConsoleApi.listSettlements(appId, "savings"),
      treasuryConsoleApi.getSettlementMode(appId, "investments"),
      treasuryConsoleApi.getSettlementMode(appId, "commodities"),
      treasuryConsoleApi.getSettlementMode(appId, "savings"),
    ])

    const firstErr =
      (!wd.success && wd.error) ||
      (!inv.success && inv.error) ||
      (!com.success && com.error) ||
      (!sav.success && sav.error) ||
      null

    if (firstErr) setError(firstErr)

    if (wd.success) setWithdrawals(wd.data?.items ?? [])
    setSettlements({
      investments: inv.success ? inv.data?.items ?? [] : [],
      commodities: com.success ? com.data?.items ?? [] : [],
      savings: sav.success ? sav.data?.items ?? [] : [],
    })
    setModes({
      investments: invMode.success ? invMode.data?.mode ?? "manual" : "manual",
      commodities: comMode.success ? comMode.data?.mode ?? "manual" : "manual",
      savings: savMode.success ? savMode.data?.mode ?? "manual" : "manual",
    })
    setReverted({
      investments: Boolean(invMode.success && invMode.data?.revertedToManual),
      commodities: Boolean(comMode.success && comMode.data?.revertedToManual),
      savings: Boolean(savMode.success && savMode.data?.revertedToManual),
    })
    setWdSelected(new Set())
    setSettleSelected({
      investments: new Set(),
      commodities: new Set(),
      savings: new Set(),
    })
    setLoading(false)
  }, [appId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!appId) return
    void loadHistory(historyFilter)
  }, [appId, historyFilter, loadHistory])

  useEffect(() => {
    if (!appId) return
    if (tab === "withdrawals") return
    void loadSettleHistory(tab, settleHistoryFilter)
  }, [appId, tab, settleHistoryFilter, loadSettleHistory])

  const badges = useMemo(
    () => ({
      withdrawals: withdrawals.filter((r) => r.status === "pending").length,
      investments: settlements.investments.filter((r) => r.status === "pending").length,
      commodities: settlements.commodities.filter((r) => r.status === "pending").length,
      savings: settlements.savings.filter((r) => r.status === "pending").length,
    }),
    [withdrawals, settlements],
  )

  const pendingWd = withdrawals.filter((r) => r.status === "pending")
  const allWdChecked = pendingWd.length > 0 && pendingWd.every((r) => wdSelected.has(r.reference))

  const approveWithdrawals = async () => {
    const refs = Array.from(wdSelected)
    if (!refs.length) return
    setActing(true)
    const res = await treasuryConsoleApi.approveWithdrawals(appId, refs)
    setActing(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    BatchToast({
      paidCount: res.data?.paidCount ?? 0,
      blockedCount: res.data?.blockedCount ?? 0,
      noun: "withdrawal request(s)",
    })
    await refresh()
    await loadHistory(historyFilter)
  }

  const rejectWithdrawals = async () => {
    const refs = Array.from(wdSelected)
    if (!refs.length) return
    setActing(true)
    const res = await treasuryConsoleApi.rejectWithdrawals(appId, refs)
    setActing(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(`${res.data?.paidCount ?? refs.length} withdrawal request(s) rejected`)
    await refresh()
    await loadHistory(historyFilter)
  }

  const approveSettlements = async (type: SettlementType) => {
    const refs = Array.from(settleSelected[type])
    if (!refs.length) return
    setActing(true)
    const res = await treasuryConsoleApi.approveSettlements(appId, type, refs)
    setActing(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    BatchToast({
      paidCount: res.data?.paidCount ?? 0,
      blockedCount: res.data?.blockedCount ?? 0,
      noun: "return(s)",
    })
    await refresh()
    await loadSettleHistory(type, settleHistoryFilter)
  }

  const rejectSettlements = async (type: SettlementType) => {
    const refs = Array.from(settleSelected[type])
    if (!refs.length) return
    setActing(true)
    const res = await treasuryConsoleApi.rejectSettlements(appId, type, refs)
    setActing(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success(`${res.data?.paidCount ?? refs.length} return(s) rejected`)
    await refresh()
    await loadSettleHistory(type, settleHistoryFilter)
  }

  const toggleMode = async (type: SettlementType, next: boolean) => {
    const mode: SettlementMode = next ? "automatic" : "manual"
    setActing(true)
    const res = await treasuryConsoleApi.setSettlementMode(appId, type, mode)
    setActing(false)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    const data = res.data
    if (mode === "automatic") {
      if (data?.revertedToManual) {
        toast.message(
          `Automatic settlement paid ${data.paidCount ?? 0}, but ${data.blockedCount ?? 0} could not be paid — reverted to Manual. Fund Treasury to continue.`,
        )
      } else if ((data?.paidCount ?? 0) > 0) {
        toast.success(`Automatic settlement complete — all ${data?.paidCount} record(s) paid`)
      } else {
        toast.success("Automatic settlement is on — nothing pending right now")
      }
    }
    await refresh()
    await loadSettleHistory(type, settleHistoryFilter)
  }

  return (
    <div className="flex-1 bg-[#F5F6F8] p-8">
      <div className="mb-5">
        <p className="mb-1.5 text-xs text-[#667085]">
          Plata / <span className="font-semibold text-[#1D2939]">Wallets</span> /{" "}
          <span className="font-semibold text-[#1D2939]">Withdrawals</span>
        </p>
        <h1 className="text-[22px] font-semibold text-[#1D2939]">Withdrawals</h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-[#667085]">
          Review customer withdrawal requests and release payouts for matured Investments,
          Commodities and Savings. All disbursement is funded from the Treasury Wallet.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {error}
        </div>
      ) : null}

      <div className="mb-0 flex gap-1.5 border-b border-[#E4E7EC]">
        {TABS.map((t) => {
          const active = tab === t.key
          const count = badges[t.key]
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "mr-5 border-b-2 px-1 py-2.5 text-[13.5px] font-bold transition-colors",
                active
                  ? "border-[#0B1E3B] text-[#0B1E3B]"
                  : "border-transparent text-[#667085] hover:text-[#1D2939]",
              )}
            >
              {t.label}
              <span className="ml-1.5 inline-block rounded-full bg-[#F2F4F7] px-1.5 py-0.5 text-[10.5px] font-extrabold text-[#667085]">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="pt-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#667085]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading withdrawals…
          </div>
        ) : tab === "withdrawals" ? (
          <WithdrawalsPanel
            rows={withdrawals}
            selected={wdSelected}
            allChecked={allWdChecked}
            acting={acting}
            canApprove={canApprovePayout}
            historyFilter={historyFilter}
            historyRows={historyRows}
            historyTotal={historyTotal}
            historyLoading={historyLoading}
            historyError={historyError}
            onHistoryFilterChange={setHistoryFilter}
            onToggleAll={(checked) => {
              if (!checked) {
                setWdSelected(new Set())
                return
              }
              setWdSelected(new Set(pendingWd.map((r) => r.reference)))
            }}
            onToggle={(ref, checked) => {
              setWdSelected((prev) => {
                const next = new Set(prev)
                if (checked) next.add(ref)
                else next.delete(ref)
                return next
              })
            }}
            onApprove={() => void approveWithdrawals()}
            onReject={() => void rejectWithdrawals()}
          />
        ) : (
          <SettlementPanel
            type={tab}
            rows={settlements[tab]}
            mode={modes[tab]}
            reverted={reverted[tab]}
            selected={settleSelected[tab]}
            acting={acting}
            canApprove={canApprovePayout}
            canToggleMode={canSetAutoSettle}
            historyFilter={settleHistoryFilter}
            historyRows={settleHistoryRows}
            historyTotal={settleHistoryTotal}
            historyLoading={settleHistoryLoading}
            historyError={settleHistoryError}
            onHistoryFilterChange={setSettleHistoryFilter}
            onToggleMode={(on) => void toggleMode(tab, on)}
            onToggleAll={(checked) => {
              const pending = settlements[tab].filter((r) => r.status === "pending")
              setSettleSelected((prev) => ({
                ...prev,
                [tab]: checked ? new Set(pending.map((r) => r.reference)) : new Set(),
              }))
            }}
            onToggle={(ref, checked) => {
              setSettleSelected((prev) => {
                const next = new Set(prev[tab])
                if (checked) next.add(ref)
                else next.delete(ref)
                return { ...prev, [tab]: next }
              })
            }}
            onApprove={() => void approveSettlements(tab)}
            onReject={() => void rejectSettlements(tab)}
          />
        )}
      </div>
    </div>
  )
}

function DecisionHistoryCard({
  variant,
  description,
  emptyNoun,
  historyFilter,
  historyRows,
  historyTotal,
  historyLoading,
  historyError,
  onHistoryFilterChange,
}: {
  variant: "withdrawals" | "settlements"
  description: string
  emptyNoun: string
  historyFilter: HistoryFilter
  historyRows: TreasuryPayoutRow[]
  historyTotal: number
  historyLoading: boolean
  historyError: string | null
  onHistoryFilterChange: (status: HistoryFilter) => void
}) {
  const showReason = historyFilter === "rejected"
  const headers =
    variant === "withdrawals"
      ? showReason
        ? ["Customer", "Requesting From", "Amount", "Requested", "Decided", "Reason", "Status"]
        : ["Customer", "Requesting From", "Amount", "Requested", "Decided", "Status"]
      : showReason
        ? ["Customer", "Product", "Principal", "Return", "Maturity", "Decided", "Reason", "Status"]
        : ["Customer", "Product", "Principal", "Return", "Maturity", "Decided", "Status"]

  return (
    <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E7EC] bg-[#F9FAFB] px-5 py-4">
        <div>
          <h3 className="text-[13.5px] font-extrabold text-[#1D2939]">Decision history</h3>
          <p className="mt-0.5 text-[11.5px] text-[#667085]">{description}</p>
        </div>
        <div
          role="tablist"
          aria-label="History status filter"
          className="inline-flex rounded-lg border border-[#E4E7EC] bg-[#F2F4F7] p-0.5"
        >
          {([
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
          ] as const).map((opt) => {
            const active = historyFilter === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onHistoryFilterChange(opt.key)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
                  active
                    ? "bg-white text-[#0B1E3B] shadow-sm"
                    : "text-[#667085] hover:text-[#1D2939]",
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {historyError ? (
        <div className="border-b border-yellow-200 bg-yellow-50 px-5 py-3 text-sm text-yellow-800">
          {historyError}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#E4E7EC] bg-[#FCFCFD]">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-[10.5px] font-extrabold uppercase tracking-wider text-[#98A2B3]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historyLoading ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-5 py-10 text-center text-sm text-[#667085]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading history…
                  </span>
                </td>
              </tr>
            ) : historyRows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-5 py-10 text-center text-sm text-[#667085]"
                >
                  No {historyFilter} {emptyNoun} yet.
                </td>
              </tr>
            ) : (
              historyRows.map((row) => {
                if (variant === "withdrawals") {
                  return (
                    <tr key={row.reference} className="border-b border-[#E4E7EC] last:border-0">
                      <td className="px-4 py-3 text-[13.5px] font-bold text-[#1D2939]">
                        {row.customerName}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                        {row.requestingFrom || row.productName || "—"}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] font-semibold text-[#1D2939]">
                        {formatPlataWalletAmount(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                        {formatShortDate(row.requestedOn)}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                        {formatShortDate(row.decidedAt)}
                      </td>
                      {showReason ? (
                        <td className="max-w-[220px] truncate px-4 py-3 text-[13.5px] text-[#667085]">
                          {row.reason?.trim() || "—"}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <StatusPill status={row.status} />
                      </td>
                    </tr>
                  )
                }

                const principal = row.principal ?? 0
                const ret = row.returnAmount ?? Math.max(0, row.amount - principal)
                return (
                  <tr key={row.reference} className="border-b border-[#E4E7EC] last:border-0">
                    <td className="px-4 py-3 text-[13.5px] font-bold text-[#1D2939]">
                      {row.customerName}
                    </td>
                    <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                      {row.productName || "—"}
                    </td>
                    <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                      {formatPlataWalletAmount(principal)}
                    </td>
                    <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                      {formatPlataWalletAmount(ret)}
                    </td>
                    <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                      {formatShortDate(row.maturity)}
                    </td>
                    <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                      {formatShortDate(row.decidedAt)}
                    </td>
                    {showReason ? (
                      <td className="max-w-[220px] truncate px-4 py-3 text-[13.5px] text-[#667085]">
                        {row.reason?.trim() || "—"}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#E4E7EC] bg-[#F9FAFB] px-5 py-3 text-[12.5px] font-semibold text-[#667085]">
        {historyLoading
          ? "…"
          : `${historyRows.length} shown${historyTotal > historyRows.length ? ` of ${historyTotal}` : ""}`}
      </div>
    </div>
  )
}

function WithdrawalsPanel({
  rows,
  selected,
  allChecked,
  acting,
  canApprove = true,
  historyFilter,
  historyRows,
  historyTotal,
  historyLoading,
  historyError,
  onHistoryFilterChange,
  onToggleAll,
  onToggle,
  onApprove,
  onReject,
}: {
  rows: TreasuryPayoutRow[]
  selected: Set<string>
  allChecked: boolean
  acting: boolean
  canApprove?: boolean
  historyFilter: HistoryFilter
  historyRows: TreasuryPayoutRow[]
  historyTotal: number
  historyLoading: boolean
  historyError: string | null
  onHistoryFilterChange: (status: HistoryFilter) => void
  onToggleAll: (checked: boolean) => void
  onToggle: (ref: string, checked: boolean) => void
  onApprove: () => void
  onReject: () => void
}) {
  const pending = rows.filter((r) => r.status === "pending")
  const selCount = selected.size

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-[10px] border border-[#C7D7FE] bg-[#EFF4FF] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#2A3B8F]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          Only <b>forceful / early withdrawals from a committed product</b> appear here — e.g. a
          customer breaking a savings term before maturity. Transfers already sitting in a
          customer&apos;s main wallet move wallet-to-wallet and need no approval, so they never
          reach this queue.
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] bg-[#F9FAFB] px-5 py-4">
          <div>
            <h3 className="text-[13.5px] font-extrabold text-[#1D2939]">Pending Withdrawal Requests</h3>
            <p className="mt-0.5 text-[11.5px] text-[#667085]">
              Select one or more requests, then approve or reject as a batch.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E4E7EC] bg-[#FCFCFD]">
                <th className="w-9 px-4 py-2.5 text-left">
                  <Checkbox
                    checked={allChecked}
                    disabled={pending.length === 0}
                    onCheckedChange={(v) => onToggleAll(v === true)}
                    className="border-[#98A2B3] data-[state=checked]:border-[#0B1E3B] data-[state=checked]:bg-[#0B1E3B]"
                  />
                </th>
                {["Customer", "Requesting From", "Amount", "Requested", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10.5px] font-extrabold uppercase tracking-wider text-[#98A2B3]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#667085]">
                    No withdrawal requests right now.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isPending = row.status === "pending"
                  return (
                    <tr
                      key={row.reference}
                      className={cn(
                        "border-b border-[#E4E7EC] last:border-0",
                        !isPending && "opacity-55",
                      )}
                    >
                      <td className="px-4 py-3">
                        {isPending ? (
                          <Checkbox
                            checked={selected.has(row.reference)}
                            onCheckedChange={(v) => onToggle(row.reference, v === true)}
                            className="border-[#98A2B3] data-[state=checked]:border-[#0B1E3B] data-[state=checked]:bg-[#0B1E3B]"
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] font-bold text-[#1D2939]">
                        {row.customerName}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                        {row.requestingFrom || row.productName || "—"}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] font-semibold text-[#1D2939]">
                        {formatPlataWalletAmount(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                        {formatShortDate(row.requestedOn)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={row.status} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#E4E7EC] bg-[#F9FAFB] px-5 py-3 text-[12.5px]">
          <span className="font-semibold text-[#667085]">{selCount} selected</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-[#D92D20] text-[#D92D20] hover:bg-[#FEF3F2] disabled:opacity-40"
              disabled={!canApprove || selCount === 0 || acting}
              onClick={onReject}
              title={!canApprove ? "You do not have permission to reject payouts" : undefined}
            >
              Reject Selected
            </Button>
            <Button
              className="bg-[#0B1E3B] text-white hover:bg-[#142B52] disabled:opacity-40"
              disabled={!canApprove || selCount === 0 || acting}
              onClick={onApprove}
              title={!canApprove ? "You do not have permission to approve payouts" : undefined}
            >
              {acting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving…
                </>
              ) : (
                "Approve Selected"
              )}
            </Button>
          </div>
        </div>
      </div>

      <DecisionHistoryCard
        variant="withdrawals"
        description="Previously approved or rejected withdrawal requests for this app."
        emptyNoun="withdrawals"
        historyFilter={historyFilter}
        historyRows={historyRows}
        historyTotal={historyTotal}
        historyLoading={historyLoading}
        historyError={historyError}
        onHistoryFilterChange={onHistoryFilterChange}
      />
    </div>
  )
}

function SettlementPanel({
  type,
  rows,
  mode,
  reverted,
  selected,
  acting,
  canApprove = true,
  canToggleMode = true,
  historyFilter,
  historyRows,
  historyTotal,
  historyLoading,
  historyError,
  onHistoryFilterChange,
  onToggleMode,
  onToggleAll,
  onToggle,
  onApprove,
  onReject,
}: {
  type: SettlementType
  rows: TreasuryPayoutRow[]
  mode: SettlementMode
  reverted: boolean
  selected: Set<string>
  acting: boolean
  canApprove?: boolean
  canToggleMode?: boolean
  historyFilter: HistoryFilter
  historyRows: TreasuryPayoutRow[]
  historyTotal: number
  historyLoading: boolean
  historyError: string | null
  onHistoryFilterChange: (status: HistoryFilter) => void
  onToggleMode: (on: boolean) => void
  onToggleAll: (checked: boolean) => void
  onToggle: (ref: string, checked: boolean) => void
  onApprove: () => void
  onReject: () => void
}) {
  const meta = SETTLEMENT_META[type]
  const isAuto = mode === "automatic"
  const pending = rows.filter((r) => r.status === "pending")
  const allChecked = pending.length > 0 && pending.every((r) => selected.has(r.reference))
  const selCount = selected.size

  return (
    <div className="space-y-4">
      {reverted ? (
        <div className="flex items-start gap-2.5 rounded-[10px] border border-[#F7CE7A] bg-[#FEF3DC] px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed text-[#92610A]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Automatic settlement ran but Treasury did not have enough to pay every row. This table
            has been switched back to <b>Manual</b> so the remaining balance isn&apos;t attempted
            again silently. Fund the Treasury Wallet, then either approve the rest manually or
            switch this back to Automatic.
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E7EC] bg-[#F9FAFB] px-5 py-4">
          <div>
            <h3 className="text-[13.5px] font-extrabold text-[#1D2939]">{meta.title}</h3>
            <p className="mt-0.5 text-[11.5px] text-[#667085]">{meta.note}</p>
          </div>
          <div className="flex items-center gap-3">
            {reverted ? (
              <span className="inline-flex items-center rounded-full bg-[#FEE4E2] px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide text-[#B42318]">
                ⚠ Reverted — insufficient funds
              </span>
            ) : null}
            <span
              className={cn(
                "min-w-[64px] text-right text-[12.5px] font-bold",
                isAuto ? "text-[#067647]" : "text-[#4B5565]",
              )}
            >
              {isAuto ? "Automatic" : "Manual"}
            </span>
            <Switch
              checked={isAuto}
              disabled={acting || !canToggleMode}
              onCheckedChange={onToggleMode}
              className="h-[26px] w-[46px] data-[state=checked]:bg-[#067647] data-[state=unchecked]:bg-[#D0D5DD]"
              title={
                !canToggleMode
                  ? "You do not have permission to change settlement mode"
                  : isAuto
                    ? "Turn off to switch to Manual"
                    : "Turn on for Automatic settlement"
              }
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#E4E7EC] bg-[#FCFCFD]">
                <th className="w-9 px-4 py-2.5 text-left">
                  <Checkbox
                    checked={allChecked}
                    disabled={isAuto || pending.length === 0}
                    onCheckedChange={(v) => onToggleAll(v === true)}
                    className="border-[#98A2B3] data-[state=checked]:border-[#0B1E3B] data-[state=checked]:bg-[#0B1E3B]"
                  />
                </th>
                {["Customer", "Product", "Principal", "Return", "Maturity", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10.5px] font-extrabold uppercase tracking-wider text-[#98A2B3]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#667085]">
                    No matured {type} pending settlement.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isPending = row.status === "pending"
                  const principal = row.principal ?? 0
                  const ret = row.returnAmount ?? Math.max(0, row.amount - principal)
                  return (
                    <tr
                      key={row.reference}
                      className={cn(
                        "border-b border-[#E4E7EC] last:border-0",
                        !isPending && "opacity-55",
                      )}
                    >
                      <td className="px-4 py-3">
                        {isPending && !isAuto ? (
                          <Checkbox
                            checked={selected.has(row.reference)}
                            onCheckedChange={(v) => onToggle(row.reference, v === true)}
                            className="border-[#98A2B3] data-[state=checked]:border-[#0B1E3B] data-[state=checked]:bg-[#0B1E3B]"
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] font-bold text-[#1D2939]">
                        {row.customerName}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                        {row.productName || "—"}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                        {formatPlataWalletAmount(principal)}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                        {formatPlataWalletAmount(ret)}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-[#1D2939]">
                        {formatShortDate(row.maturity)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={row.status} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#E4E7EC] bg-[#F9FAFB] px-5 py-3 text-[12.5px]">
          {isAuto ? (
            <span className="font-semibold text-[#067647]">
              ⚙ Settling automatically — no action needed. Treasury is checked and payouts released
              the moment records mature.
            </span>
          ) : (
            <span className="font-semibold text-[#667085]">{selCount} selected</span>
          )}
          {!isAuto ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-[#D92D20] text-[#D92D20] hover:bg-[#FEF3F2] disabled:opacity-40"
                disabled={!canApprove || selCount === 0 || acting}
                onClick={onReject}
                title={!canApprove ? "You do not have permission to reject payouts" : undefined}
              >
                Reject Returns
              </Button>
              <Button
                className="bg-[#0B1E3B] text-white hover:bg-[#142B52] disabled:opacity-40"
                disabled={!canApprove || selCount === 0 || acting}
                onClick={onApprove}
                title={!canApprove ? "You do not have permission to approve payouts" : undefined}
              >
                {acting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving…
                  </>
                ) : (
                  "Approve Returns"
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <DecisionHistoryCard
        variant="settlements"
        description={`Previously approved or rejected matured ${type} for this app.`}
        emptyNoun={type}
        historyFilter={historyFilter}
        historyRows={historyRows}
        historyTotal={historyTotal}
        historyLoading={historyLoading}
        historyError={historyError}
        onHistoryFilterChange={onHistoryFilterChange}
      />
    </div>
  )
}
