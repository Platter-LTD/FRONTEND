"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Search, Loader2 } from "lucide-react"
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

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">Staff Accounts</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search staff"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
            >
              <option value="all">Status</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div>Name</div>
            <div>Role</div>
            <div>Email</div>
            <div>Last Login</div>
            <div>Status</div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading staff…
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No staff accounts found.</p>
          ) : (
            filtered.map((staff) => (
              <div
                key={staff.id}
                className="grid grid-cols-5 gap-4 p-4 border-b border-gray-100 last:border-b-0 text-sm"
              >
                <div className="font-medium">{staff.name}</div>
                <div>{staff.role}</div>
                <div>{staff.email}</div>
                <div>{staff.lastLogin}</div>
                <div>
                  <Badge className={getStatusColor(staff.status)}>{staff.status}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
