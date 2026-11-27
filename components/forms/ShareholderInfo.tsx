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
import { shareholderDetailsRecord, toShareholderRow } from "@/lib/shareholders"
import { useShareholderActions } from "@/components/ShareholderActions"

export function ShareholderInfo() {
  const { user, loading: authLoading } = useAuth()
  const { shareholders, setShareholders } = useComplianceForm()
  const { openCreate, actionsColumn, deleteDialog } = useShareholderActions()
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
        setShareholders(list.map(toShareholderRow))
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

  const columns: ColumnDef<ShareholderRow, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-gray-900">{row.original.name}</span> },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "date", header: "Date/time" },
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
    actionsColumn,
  ]

  return (
    <div className="space-y-6">
      <DataTable
        tableId="shareholders"
        onRefresh={() => setReloadKey((k) => k + 1)}
        title="Shareholders"
        description="Add everyone who owns 25% or more of the business. Include each shareholder's BVN or NIN, address and proof of address."
        columns={columns}
        data={shareholders}
        isLoading={loading}
        rowDetails={{ title: (r) => r.name, record: shareholderDetailsRecord }}
        clientSearch
        download
        empty="No shareholders yet. Use “Create shareholder” to add one."
        action={
          <BrandButton onClick={openCreate} className="h-9 px-4">
            <UserPlus className="size-4" />
            Create shareholder
          </BrandButton>
        }
      />

      <CreateShareholderDrawer />
      {deleteDialog}
    </div>
  )
}

export default ShareholderInfo
