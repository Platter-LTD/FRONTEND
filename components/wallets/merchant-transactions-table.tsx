"use client"

import { Search } from "lucide-react"
import { IoIosCopy } from "react-icons/io"
import { Skeleton } from "@/components/ui/skeleton"
import type { Transaction } from "@/lib/services/walletService"

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

export function MerchantTransactionsTable({
  transactions,
  loading,
  currency = "USD",
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
  const sym = currency === "USD" ? "$" : ""

  const filtered = transactions.filter((tx) => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return true
    const ref = (tx.referenceId || tx.id || "").toLowerCase()
    const desc = (tx.description || "").toLowerCase()
    const st = (tx.status || "").toLowerCase()
    return ref.includes(q) || desc.includes(q) || st.includes(q)
  })

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Transactions</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#8B7355] text-sm w-64"
          />
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <>
            <div className="bg-[#F5F5F5] grid grid-cols-6 gap-4 px-6 py-3">
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
          <div className="text-center py-12 bg-gray-50">
            <p className="text-gray-500 text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F5F5F5]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Amount</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Type</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Description</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Reference</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((tx) => {
                const ref = tx.referenceId || tx.id
                const amt = Math.abs(tx.amount)
                const signed = tx.type === "DEBIT" ? -amt : amt
                return (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sym}
                      {signed.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tx.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{tx.status}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[220px] truncate" title={tx.description}>
                      {tx.description || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate max-w-[140px]" title={ref}>
                          {ref}
                        </span>
                        <button
                          type="button"
                          onClick={() => copy(ref)}
                          className="text-gray-400 hover:text-gray-600 shrink-0"
                          title="Copy reference"
                        >
                          <IoIosCopy size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatWhen(tx.createdAt)}</td>
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
