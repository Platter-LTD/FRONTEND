"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MerchantTeamState } from "@/hooks/useMerchantTeam"
import type { MerchantRole } from "@/lib/services/teamService"
import { permissionLabel } from "@/lib/teamPermissions"

export interface ManageRoleTabProps {
  team: MerchantTeamState
}

export function ManageRoleTab({ team }: ManageRoleTabProps) {
  const { staffRows, roles, catalog, loading, error } = team
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Pending" | "Suspended">(
    "all",
  )
  const [viewRole, setViewRole] = useState<MerchantRole | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return staffRows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false
      if (!q) return true
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
      )
    })
  }, [staffRows, search, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Pending":
        return "bg-orange-100 text-orange-800"
      case "Suspended":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  type StaffRow = (typeof staffRows)[number]
  const staffColumns: ColumnDef<StaffRow, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span> },
    { accessorKey: "role", header: "Role" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "lastLogin", header: "Last Login" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge className={getStatusColor(row.original.status)}>{row.original.status}</Badge> },
  ]

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {error}
        </p>
      ) : null}

            <DataTable
        tableId="manage-role-staff"
        onRefresh={() => void team.refetch()}
        title="Staff Accounts"
        columns={staffColumns}
        data={filtered}
        isLoading={loading}
        onSearch={setSearch}
        initialSearch={search}
        searchPlaceholder="Search staff"
        download
        resetPageSignal={`${search}|${statusFilter}`}
        empty="No staff accounts found."
        action={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium mb-6">Roles</h3>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading roles…
          </div>
        ) : roles.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No roles yet. Create one under the Create Role tab.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <div key={role.id} className="text-center">
                <div className="w-12 h-12 bg-[#E0D8C3] rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-[#9A813F]" />
                </div>
                <h4 className="font-medium mb-2">{role.name}</h4>
                <p className="text-sm text-gray-600 mb-3 min-h-[40px]">
                  {role.description || "No description"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[#9A813F] border-[#9A813F] bg-transparent"
                  onClick={() => setViewRole(role)}
                >
                  View permission
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(viewRole)} onOpenChange={(open) => !open && setViewRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewRole?.name || "Permissions"}</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {(viewRole?.permissions || []).length === 0 ? (
              <li className="text-sm text-gray-500">No permissions assigned.</li>
            ) : (
              (viewRole?.permissions || []).map((p) => (
                <li key={p} className="text-sm text-gray-700 border-b border-gray-100 py-2">
                  {permissionLabel(p, catalog)}
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  )
}
