"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TableEmptyState } from "@/components/ui/table-states"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { billingService } from "@/lib/services/billing-service"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils/billing-utils"
import type { Transaction } from "@/types/billing"

export default function AdminBillingPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [billings, setBillings] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    fetchBillings()
  }, [activeTab, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  const fetchBillings = async () => {
    try {
      setLoading(true)
      setError(null)

      const params: any = {
        page: currentPage,
        limit: pageSize,
      }

      // Add status filter based on active tab
      if (activeTab === "incoming") {
        params.status = "incoming"
      } else if (activeTab === "pending") {
        params.status = "pending"
      }

      const response = await billingService.getTransactions(params)

      if (response.success && response.data) {
        setBillings(response.data)
        // Use the API's total when it sends one; otherwise allow a next page
        // whenever this page came back full.
        const total = (response as { pagination?: { total?: number } }).pagination?.total
        setTotalCount(
          typeof total === "number"
            ? total
            : (currentPage - 1) * pageSize + response.data.length + (response.data.length === pageSize ? 1 : 0)
        )
      } else {
        setBillings([])
        setTotalCount(0)
      }
    } catch (err: any) {
      console.error('Error fetching billings:', err)
      setError(err.message || 'Failed to load billings')
      setBillings([])
    } finally {
      setLoading(false)
    }
  }

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

