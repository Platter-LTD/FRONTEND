"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { MoreVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { productApi } from "@/lib/services/product-api"
import { TableSkeleton } from "@/components/ui/table-skeleton"

type WorkflowRow = {
  id: string
  mortgageRequest: string
  name: string
  ref: string
  date: string
  status: string
}

export default function MortgageWorkflowPage() {
  const params = useParams()
  const appId = String(params.id || "")
  const [activeTab, setActiveTab] = useState("requested")
  const [rows, setRows] = useState<WorkflowRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tabs = [
    { id: "requested", label: "Loan Request" },
    { id: "under_review", label: "Under Review" },
    { id: "approved", label: "Approved" },
    { id: "declined", label: "Declined" },
    { id: "blacklisted", label: "Blacklisted" },
  ]

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
          .filter((x) => !appId || String(x.appId || x.createAppId || "") === appId)
          .map((x) => ({
            id: String(x.id ?? x.applicationId ?? ""),
            mortgageRequest: String(x.productName ?? x.globalProductName ?? x.reference ?? "Mortgage Application"),
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
  }, [activeTab, appId])

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
    <div className="flex-1 bg-white p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mortgage Workflow</h1>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]"></div>}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <TableSkeleton columnCount={6} rowCount={6} />
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F5F5F5]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Mortgage Request</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Ref</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Date</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Status</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mortgages.length === 0 ? (
              <tr>
                <td className="px-6 py-6 text-sm text-gray-500" colSpan={6}>
                  No applications found.
                </td>
              </tr>
            ) : (
              mortgages.map((mortgage) => (
              <tr key={mortgage.id || mortgage.ref} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{mortgage.mortgageRequest}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.ref}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.date}</td>
                <td className="px-6 py-4">
                  <Badge className={getStatusBadge(mortgage.status)}>{mortgage.status.replaceAll("_", " ")}</Badge>
                </td>
                <td className="px-6 py-4">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical size={18} />
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
