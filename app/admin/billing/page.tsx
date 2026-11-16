"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TableEmptyState } from "@/components/ui/table-states"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils/billing-utils"
import type { Transaction } from "@/types/billing"
import { useBillingTransactions } from "@/hooks/queries/billing"

export default function AdminBillingPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Transactions for the tab + page (cached per filter/page).
  const status = activeTab === "incoming" ? "incoming" : activeTab === "pending" ? "pending" : undefined
  const query = useBillingTransactions({ page: currentPage, limit: pageSize, ...(status ? { status } : {}) })
  const billings: Transaction[] = (query.data?.success && query.data.data) || []
  const loading = query.isLoading
  const error = query.error ? query.error.message || "Failed to load billings" : null
  // Use the API's total when it sends one; otherwise allow a next page whenever this page came back full.
  const apiTotal = (query.data as { pagination?: { total?: number } } | undefined)?.pagination?.total
  const totalCount =
    typeof apiTotal === "number"
      ? apiTotal
      : (currentPage - 1) * pageSize + billings.length + (billings.length === pageSize ? 1 : 0)
  const fetchBillings = () => void query.refetch()

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])


  const handleDownload = (billing: Transaction) => {
    // Implement download functionality
  }

  const columns: ColumnDef<Transaction, unknown>[] = [
    { id: "date", header: "Date", accessorFn: (b) => b.date || b.createdAt, cell: ({ row }) => formatDate(row.original.date || row.original.createdAt) },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount, row.original.currency) },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${getStatusColor(row.original.status)}`}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </span>
      ),
    },
    { accessorKey: "paymentMethod", header: "Payment Method", cell: ({ row }) => row.original.paymentMethod || "N/A" },
    { accessorKey: "transactionId", header: "Transaction ID" },
    {
      id: "paymentLink",
      header: "Payment link",
      cell: ({ row }) =>
        row.original.status === "successful" ? (
          <Button type="button" variant="outline" size="sm" onClick={() => handleDownload(row.original)}>
            Download
          </Button>
        ) : (
          <span className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-400">Unavailable</span>
        ),
    },
  ]

  return (
    <div className="flex-1 bg-white">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("all")}
            className={`py-4 text-sm relative ${activeTab === "all" ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            All billings
            {activeTab === "all" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
          </button>
          <button
            onClick={() => setActiveTab("incoming")}
            className={`py-4 text-sm relative ${activeTab === "incoming" ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Incoming billing
            {activeTab === "incoming" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`py-4 text-sm relative ${activeTab === "pending" ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Pending billings
            {activeTab === "pending" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
          </button>
        </div>
      </div>

      <div className="p-8">
        <DataTable
          tableId={`admin-billings-${activeTab}`}
          title={activeTab === "all" ? "All Billings" : activeTab === "incoming" ? "Incoming Billings" : "Pending Billings"}
          columns={columns}
          data={billings}
          isLoading={loading}
          isError={!!error}
          error={error}
          onRefresh={fetchBillings}
          clientSearch
          download
          empty={<TableEmptyState title="No billings found" description="Billing records will appear here" />}
          serverPagination={{
            totalCount,
            pageIndex: currentPage - 1,
            pageSize,
            onPageChange: (index) => setCurrentPage(index + 1),
            onPageSizeChange: (size) => {
              setPageSize(size)
              setCurrentPage(1)
            },
          }}
        />
      </div>
    </div>
  )
}

