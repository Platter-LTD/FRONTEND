"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Loader2,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MerchantTeamState } from "@/hooks/useMerchantTeam"
import { teamApi, type StaffTableRow } from "@/lib/services/teamService"
import { hasAnyPermission, TEAM_PERMISSIONS } from "@/lib/teamPermissions"
import { useAppSelector } from "@/store/hooks"
import { toast } from "sonner"

export interface AddStaffTabProps {
  onAddStaff?: () => void
  team: MerchantTeamState
}

export function AddStaffTab({ onAddStaff, team }: AddStaffTabProps) {
  const { staffRows, counts, loading, error, roles, refetch } = team
  const sessionPermissions = useAppSelector((s) => s.auth.permissions)
  const canInvite = hasAnyPermission([...TEAM_PERMISSIONS.invite], sessionPermissions)
  const canChangeRole = hasAnyPermission(
    [...TEAM_PERMISSIONS.changeRole],
    sessionPermissions,
  )
  const canSuspend = hasAnyPermission(
    [...TEAM_PERMISSIONS.suspendActivate],
    sessionPermissions,
  )

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Pending" | "Suspended">(
    "all",
  )
  const [roleDialogRow, setRoleDialogRow] = useState<StaffTableRow | null>(null)
  const [nextRoleId, setNextRoleId] = useState("")
  const [actionBusy, setActionBusy] = useState(false)

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

  const runMemberAction = async (
    row: StaffTableRow,
    action: "suspend" | "activate",
  ) => {
    if (row.kind !== "member") return
    setActionBusy(true)
    const res =
      action === "suspend"
        ? await teamApi.suspendMember(row.id)
        : await teamApi.activateMember(row.id)
    setActionBusy(false)
    if (!res.success) {
      toast.error(res.error || `Failed to ${action} member`)
      return
    }
    toast.success(res.message || (action === "suspend" ? "Member suspended" : "Member activated"))
    void refetch()
  }

  const submitRoleChange = async () => {
    if (!roleDialogRow || roleDialogRow.kind !== "member" || !nextRoleId) return
    setActionBusy(true)
    const res = await teamApi.changeMemberRole(roleDialogRow.id, nextRoleId)
    setActionBusy(false)
    if (!res.success) {
      toast.error(res.error || "Failed to update role")
      return
    }
    toast.success(res.message || "Role updated")
    setRoleDialogRow(null)
    void refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          <div className="bg-[#9A813F33] rounded-lg p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-[#9A813F]" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? "—" : counts.total}
                </div>
                <div className="text-sm text-gray-600">Staff Accounts</div>
              </div>
            </div>
          </div>
          <div className="bg-[#9A813F33] rounded-lg p-6">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-[#9A813F]" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? "—" : counts.active}
                </div>
                <div className="text-sm text-gray-600">Active Staff Accounts</div>
              </div>
            </div>
          </div>
          <div className="bg-[#9A813F33] rounded-lg p-6">
            <div className="flex items-center gap-3">
              <UserX className="w-8 h-8 text-[#9A813F]" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? "—" : counts.inactive}
                </div>
                <div className="text-sm text-gray-600">Inactive Staff Accounts</div>
              </div>
            </div>
          </div>
        </div>
        {canInvite ? (
          <Button className="bg-black text-white hover:bg-gray-800 ml-6" onClick={onAddStaff}>
            <Users className="w-4 h-4 mr-2" />
            Add Team Member
          </Button>
        ) : null}
      </div>

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
          <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div>Name</div>
            <div>Role</div>
            <div>Email</div>
            <div>Last Login</div>
            <div>Status</div>
            <div>Actions</div>
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
                className="grid grid-cols-6 gap-4 p-4 border-b border-gray-100 last:border-b-0 text-sm items-center"
              >
                <div className="font-medium">{staff.name}</div>
                <div>{staff.role}</div>
                <div className="truncate">{staff.email}</div>
                <div>{staff.lastLogin}</div>
                <div>
                  <Badge className={getStatusColor(staff.status)}>{staff.status}</Badge>
                </div>
                <div>
                  {staff.kind === "member" && (canChangeRole || canSuspend) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={actionBusy}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canChangeRole ? (
                          <DropdownMenuItem
                            onClick={() => {
                              setRoleDialogRow(staff)
                              setNextRoleId(staff.roleId || roles[0]?.id || "")
                            }}
                          >
                            Change role
                          </DropdownMenuItem>
                        ) : null}
                        {canSuspend ? (
                          staff.status === "Suspended" ? (
                            <DropdownMenuItem
                              onClick={() => void runMemberAction(staff, "activate")}
                            >
                              Activate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => void runMemberAction(staff, "suspend")}
                            >
                              Suspend
                            </DropdownMenuItem>
                          )
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : staff.kind === "invitation" ? (
                    <span className="text-xs text-gray-400">Invite pending</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(roleDialogRow)}
        onOpenChange={(open) => !open && setRoleDialogRow(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Update role for <strong>{roleDialogRow?.email}</strong>
          </p>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={nextRoleId}
            onChange={(e) => setNextRoleId(e.target.value)}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogRow(null)}>
              Cancel
            </Button>
            <Button
              className="bg-black text-white hover:bg-gray-800"
              disabled={actionBusy || !nextRoleId}
              onClick={() => void submitRoleChange()}
            >
              {actionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
