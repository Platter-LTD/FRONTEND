"use client"

import { useEffect, useMemo, useState } from "react"
import { MoreVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { productApi } from "@/lib/services/product-api"
import { TableSkeleton } from "@/components/ui/table-skeleton"

const tabs = [
  { label: "Loan requests", value: "requested" },
  { label: "Under review", value: "under_review" },
  { label: "Approved", value: "approved" },
  { label: "Declined", value: "declined" },
  { label: "Blacklisted", value: "blacklisted" },
]

type WorkflowRow = {
  id: string
  loanRequest: string
  name: string
  ref: string
  date: string
  status: string
}

export default function MortgageWorkflowPage() {
  const [activeTab, setActiveTab] = useState("requested")
  const [rows, setRows] = useState<WorkflowRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    productApi
      .getLoanWorkflow({ loanWorkflowStatus: activeTab, limit: 100 })
      .then((res) => {
        if (cancelled) return
        const raw = (res as { data?: unknown }).data
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as { items?: unknown[] } | undefined)?.items)
            ? (raw as { items: unknown[] }).items
            : []
        const mapped: WorkflowRow[] = list
          .map((x) => x as Record<string, unknown>)
          .filter((x) => String(x.productType || "").toUpperCase() === "MORTGAGE")
          .map((x) => ({
            id: String(x.id ?? x.applicationId ?? ""),
            loanRequest: String(x.productName ?? x.globalProductName ?? x.reference ?? "Mortgage Application"),
            name: String(x.userName ?? x.fullName ?? x.customerName ?? x.userId ?? "Unknown"),
            ref: String(x.reference ?? x.applicationReference ?? x.id ?? "—"),
            date: String(x.createdAt ?? x.applicationDate ?? "—"),
            status: String(x.loanWorkflowStatus ?? "requested"),
          }))
        setRows(mapped)
      })
      .catch((e) => {
        if (cancelled) return
        setRows([])
        setError(e instanceof Error ? e.message : "Failed to load mortgage workflow")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTab])

  const getStatusBadge = (status: string) => {
    const styles = {
      requested: "bg-[#E9D5FF] text-[#7C3AED] hover:bg-[#E9D5FF]",
      under_review: "bg-[#DBEAFE] text-[#2563EB] hover:bg-[#DBEAFE]",
      approved: "bg-[#DCFCE7] text-[#166534] hover:bg-[#DCFCE7]",
      declined: "bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FEE2E2]",
      blacklisted: "bg-[#E5E7EB] text-[#374151] hover:bg-[#E5E7EB]",
    }
    return styles[status as keyof typeof styles] || styles.requested
  }

  const mortgages = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        date: r.date !== "—" ? new Date(r.date).toLocaleDateString() : "—",
      })),
    [rows],
  )

  return (
    <div className="p-8 bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mortgage Workflow</h1>
      {/* </CHANGE> */}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`pb-4 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.value
                  ? "border-[#7C3AED] text-[#7C3AED]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <TableSkeleton columnCount={6} rowCount={6} />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700">Loan Request</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700">Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700">Ref</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mortgages.length === 0 ? (
              <tr>
                <td className="px-6 py-6 text-sm text-gray-500" colSpan={6}>
                  No applications found.
                </td>
              </tr>
            ) : (
              mortgages.map((mortgage) => (
              <tr key={mortgage.id || mortgage.ref} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{mortgage.loanRequest}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.ref}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.date}</td>
                <td className="px-6 py-4">
                  <Badge className={getStatusBadge(mortgage.status)}>{mortgage.status.replaceAll("_", " ")}</Badge>
                </td>
                <td className="px-6 py-4">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </td>
              </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
