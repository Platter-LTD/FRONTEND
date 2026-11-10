"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Copy } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { adminWalletApi, AdminWalletTransaction } from "@/lib/services/adminService"
import WalletHistoryDrawer from "@/components/drawers/wallet-history-drawer"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied!"))
}

export default function AdminWalletPage() {
  const [activeTab, setActiveTab] = useState("summary")
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [transactions, setTransactions] = useState<AdminWalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<{
    totalWallets?: number
    totalBalance?: number
    activeWallets?: number
  }>({})

  const fetchData = async () => {
    setLoading(true)

    // Fetch summary
    const summaryRes = await adminWalletApi.getSummary()
    if (summaryRes.success && summaryRes.data) {
      setSummary(summaryRes.data)
    }

    // Fetch transactions
    const txRes = await adminWalletApi.getAllTransactions({ limit: 50 })
    if (txRes.success && txRes.data) {
      setTransactions(txRes.data)
    } else {
      setTransactions([])
    }

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])


  const formatCurrency = (n: number) =>
    `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatDate = (d: string) => {
    const date = new Date(d)
    return `${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} / ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  }

  const columns: ColumnDef<AdminWalletTransaction, unknown>[] = [
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row: { original: tx } }) => (
        <span className={`font-semibold ${tx.type === "CREDIT" ? "text-green-700" : "text-red-700"}`}>
          {tx.type === "CREDIT" ? "+" : "-"}{formatCurrency(tx.amount)}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row: { original: tx } }) => (
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${tx.type === "CREDIT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {tx.type}
        </span>
      ),
    },
    {
      id: "reference",
      header: "Reference",
      accessorFn: (tx) => tx.referenceId ?? tx.id,
      cell: ({ row: { original: tx } }) => (
        <div className="flex items-center gap-1 font-mono">
          <span>{tx.referenceId?.slice(0, 16) ?? tx.id.slice(0, 12)}</span>
          <button
            type="button"
            aria-label="Copy reference"
            className="text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation()
              copyToClipboard(tx.referenceId ?? tx.id)
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
    { accessorKey: "createdAt", header: "Timestamp", cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      accessorKey: "description",
      header: "Description",
      size: 220,
      cell: ({ row }) => <span className="block truncate" title={row.original.description}>{row.original.description || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row: { original: tx } }) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            tx.status === "COMPLETED" ? "bg-green-100 text-green-700" : tx.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {tx.status}
        </span>
      ),
    },
    {
      id: "user",
      header: "User",
      accessorFn: (tx) => tx.userEmail ?? "",
      cell: ({ row: { original: tx } }) =>
        tx.userEmail ? (
          <div>
            <div>{tx.userEmail}</div>
            {tx.userPhone && <div className="text-xs text-gray-400">{tx.userPhone}</div>}
          </div>
        ) : (
          "—"
        ),
    },
  ]

  return (
    <div className="flex-1 bg-white">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-8">
        <div className="flex gap-8">
          {[
            { id: "summary", label: "Summary" },
            { id: "total", label: "Total wallets" },
            { id: "commutative", label: "Cumulative balances" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-sm relative ${activeTab === tab.id ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {/* Summary Card */}
        <div className="bg-[#3061F5] rounded-3xl p-8 mb-8 relative">
          <div className="text-white">
            <h2 className="text-2xl mb-1">Platform Overview</h2>
            <p className="text-white/70 text-sm mb-6">All wallets • Live data from wallet-ms</p>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-64 bg-white/25" />
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-24 bg-white/20" />
                  <Skeleton className="h-4 w-14 bg-white/20" />
                  <Skeleton className="h-4 w-20 bg-white/20" />
                </div>
              </div>
            ) : (
              <>
                <p className="text-5xl font-bold tracking-tight mb-4">
                  {formatCurrency(summary.totalBalance ?? 0)}
                </p>
                <div className="flex gap-6 text-sm text-white/80">
                  <span>{summary.totalWallets ?? "—"} total wallets</span>
                  <span>•</span>
                  <span>{summary.activeWallets ?? "—"} active</span>
                </div>
              </>
            )}
          </div>
          <div className="absolute top-8 right-8 flex gap-2">
            <button
              onClick={fetchData}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="bg-white hover:bg-gray-50 text-gray-900 px-6 py-2.5 rounded-lg text-sm transition-colors font-medium"
            >
              View transactions
            </button>
          </div>
        </div>

        <DataTable
          tableId="admin-wallet-transactions"
          title="Transaction History"
          columns={columns}
          data={transactions}
          isLoading={loading}
          onRefresh={fetchData}
          clientSearch
          searchPlaceholder="Search by ref, email..."
          download
          empty="No transactions yet."
        />
      </div>

      <WalletHistoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  )
}
