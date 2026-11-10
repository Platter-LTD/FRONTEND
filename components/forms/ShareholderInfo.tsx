"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserPlus } from "lucide-react"
import { BrandButton } from "@/components/compliance/compliance-ui"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { CreateShareholderDrawer } from "@/components/CreateShareholderDrawer"
import { ComplianceService } from "@/lib/services/complianceService"
import { toast } from "react-toastify"
import { useAuth } from "@/hooks/useAuth"
import { useComplianceForm } from "@/providers/ComplianceFormProvider"
import type { ShareholderRow } from "@/providers/ComplianceFormProvider"
import { pickShareholderPhone } from "@/lib/pickShareholderPhone"
import { pickShareholderKycUrl } from "@/lib/pickShareholderKycUrl"

export function ShareholderInfo() {
  const { user, loading: authLoading } = useAuth()
  const { shareholders, setShareholders, setShareholderDrawerOpen } = useComplianceForm()
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Fetch shareholders on mount so the table persists after refresh (merchant or admin)
  useEffect(() => {
    if (authLoading) return
    if (!user) return

    const load = async () => {
      setLoading(true)
      try {
        const list = await ComplianceService.getShareholdersForCurrentMerchant()
        const mapped: ShareholderRow[] = list.map((s: any) => ({
          name: s.fullName || s.name || "Unknown",
          email: s.email || "",
          phone: pickShareholderPhone(s),
          date: (s.submittedAt || new Date().toISOString()).slice(0, 16).replace("T", " "),
          kycUrl: pickShareholderKycUrl(s) || undefined,
          status:
            s.status === "APPROVED" || s.status === "Successful"
              ? "Successful"
              : s.status === "REJECTED"
                ? "Failed"
                : "Pending",
        }))
        setShareholders(mapped)
      } catch (err: any) {
        console.error("Failed to fetch shareholders", err)
        if (err?.response?.status === 404) {
          setShareholders([])
        } else {
          toast.error("Failed to load shareholders")
          setShareholders([])
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authLoading, user, setShareholders, reloadKey])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Successful":
        return "bg-green-100 text-green-800"
      case "Failed":
        return "bg-red-100 text-red-800"
      case "Pending":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const copyKycUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("KYC link copied to clipboard")
    } catch {
      toast.error("Could not copy — select the link manually")
    }
  }

  const emailKycLink = (row: ShareholderRow) => {
    const url = row.kycUrl?.trim()
    if (!url) {
      toast.error("No KYC link for this shareholder")
      return
    }
    if (!row.email?.trim()) {
      toast.error("No email on file — copy the link instead")
      return
    }
    const subject = encodeURIComponent("Complete your shareholder KYC")
    const body = encodeURIComponent(
      `Hello,\n\nPlease complete your shareholder verification using this link:\n\n${url}\n\nThank you.`,
    )
    window.location.href = `mailto:${encodeURIComponent(row.email.trim())}?subject=${subject}&body=${body}`
  }

  const columns: ColumnDef<ShareholderRow, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-gray-900">{row.original.name}</span> },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "date", header: "Date/time" },
    {
      id: "kyc",
      header: "KYC",
      accessorFn: (r) => r.kycUrl ?? "",
      cell: ({ row: { original: row } }) =>
        row.kycUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[#9A813F] hover:text-[#7A6449]"
              onClick={() => void copyKycUrl(row.kycUrl!)}
            >
              Copy link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[#9A813F] hover:text-[#7A6449]"
              onClick={() => emailKycLink(row)}
              disabled={!row.email?.trim()}
            >
              Email link
            </Button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">No link</span>
        ),
    },
    {
      id: "upload",
      header: "Upload",
      cell: () => (
        <Button variant="ghost" size="sm" className="text-[#9A813F] hover:text-[#7A6449]">
          Upload
        </Button>
      ),
    },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge className={getStatusColor(row.original.status)}>{row.original.status}</Badge> },
  ]

  return (
    <div className="space-y-6">
      <DataTable
        tableId="shareholders"
        onRefresh={() => setReloadKey((k) => k + 1)}
        title="Shareholders"
        description="Add everyone who owns 25% or more of the business. Each shareholder gets a KYC link to verify their identity."
        columns={columns}
        data={shareholders}
        isLoading={loading}
        clientSearch
        download
        empty="No shareholders yet. Use “Create shareholder” to add one."
        action={
          <BrandButton onClick={() => setShareholderDrawerOpen(true)} className="h-9 px-4">
            <UserPlus className="size-4" />
            Create shareholder
          </BrandButton>
        }
      />

      <CreateShareholderDrawer />
    </div>
  )
}

export default ShareholderInfo
