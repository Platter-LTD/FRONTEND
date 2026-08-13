"use client"

import { useState } from "react"
import { Search, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import type { Transaction } from "@/lib/services/walletService"
import { formatPlataWalletAmount } from "@/lib/walletDisplay"
import { cn } from "@/lib/utils"

function formatWhen(iso: string | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function txTypeLabel(type: Transaction["type"]): "Deposit" | "Withdrawal" {
  return type === "DEBIT" ? "Withdrawal" : "Deposit"
}

function truncateRef(value: string, max = 18) {
  if (!value) return "—"
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

function RefHoverCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const full = value || "—"

  const copy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success("Reference copied")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy")
    }
  }

  return (
    <div className="group relative inline-flex max-w-[11rem] items-center">
      <button
        type="button"
        className="truncate text-left text-sm text-gray-800 underline-offset-2 hover:underline"
      >
        {truncateRef(full)}
      </button>
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-full z-40 mt-2 w-80 max-w-[min(20rem,calc(100vw-2rem))] min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-lg opacity-0 transition-opacity",
          "group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
        )}
      >
        <p className="max-w-full whitespace-normal break-all [overflow-wrap:anywhere] [word-break:break-all] text-xs leading-relaxed text-gray-700">
          {full}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy reference"}
        </button>
      </div>
    </div>
  )
}

export function MerchantTransactionsTable({
  transactions,
  loading,
  currency = "NGN",
  searchTerm,
  onSearchChange,
  emptyMessage = "No transactions yet",
}: {
  transactions: Transaction[]
  loading: boolean
  currency?: string
  searchTerm: string
  onSearchChange: (v: string) => void
  emptyMessage?: string
}) {
  void currency
  const filtered = transactions.filter((tx) => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return true
    const ref = (tx.referenceId || tx.id || "").toLowerCase()
    const desc = (tx.description || "").toLowerCase()
    const st = (tx.status || "").toLowerCase()
    const typ = txTypeLabel(tx.type).toLowerCase()
    return ref.includes(q) || desc.includes(q) || st.includes(q) || typ.includes(q)
  })

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Transactions</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-64 rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#8B7355]"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        {loading ? (
          <>
            <div className="grid grid-cols-6 gap-4 bg-[#F5F5F5] px-6 py-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-16" />
              ))}
            </div>
            <div className="divide-y divide-gray-200">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="grid grid-cols-6 gap-4 px-6 py-4">
                  {[1, 2, 3, 4, 5, 6].map((col) => (
                    <Skeleton key={col} className="h-4 w-20" />
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : filtered.length === 0 ? (
          <div className="bg-gray-50 py-12 text-center">
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <table className="w-full table-fixed">
            <thead className="bg-[#F5F5F5]">
              <tr>
                <th className="w-[110px] px-6 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                <th className="w-[120px] px-6 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                <th className="w-[110px] px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="w-[28%] px-6 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                <th className="w-[160px] px-6 py-3 text-left text-sm font-medium text-gray-700">Reference</th>
                <th className="w-[160px] px-6 py-3 text-left text-sm font-medium text-gray-700">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((tx) => {
                const ref = tx.referenceId || tx.id
                const amt = Math.abs(tx.amount)
                const typeLabel = txTypeLabel(tx.type)
                return (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {tx.type === "DEBIT" ? "-" : ""}
                      {formatPlataWalletAmount(amt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          typeLabel === "Deposit"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-800",
                        )}
                      >
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tx.status}</td>
                    <td className="max-w-0 truncate px-6 py-4 text-sm text-gray-600" title={tx.description}>
                      {tx.description || "—"}
                    </td>
                    <td className="overflow-visible px-6 py-4 text-sm text-gray-600">
                      <RefHoverCell value={ref} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {formatWhen(tx.createdAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
