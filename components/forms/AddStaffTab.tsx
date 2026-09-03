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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { MerchantTeamState } from "@/hooks/useMerchantTeam"
import {
  activityActionLabel,
  formatLastLogin,
  teamApi,
  type StaffTableRow,
} from "@/lib/services/teamService"
import { TEAM_PERMISSIONS } from "@/lib/teamPermissions"
import { usePermissions } from "@/hooks/usePermissions"
import { toast } from "sonner"

export interface AddStaffTabProps {
  onAddStaff?: () => void
  team: MerchantTeamState
}

function statusColor(status: string) {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800"
    case "Pending":
      return "bg-orange-100 text-orange-800"
    case "Suspended":
      return "bg-red-100 text-red-800"
    case "Deactivated":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function AddStaffTab({ onAddStaff, team }: AddStaffTabProps) {
  const {
    staffRows,
    formerStaffRows,
    activityLogs,
    counts,
    loading,
    error,
    roles,
    refetch,
  } = team
  const { can } = usePermissions()
  const canInvite = can([...TEAM_PERMISSIONS.invite])
  const canChangeRole = can([...TEAM_PERMISSIONS.changeRole])
  const canSuspend = can([...TEAM_PERMISSIONS.suspendActivate])
  const canDeactivate = can([...TEAM_PERMISSIONS.deactivate])
  const canViewLogs = can([...TEAM_PERMISSIONS.activityLogs])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Active" | "Pending" | "Suspended"
  >("all")
  const [roleDialogRow, setRoleDialogRow] = useState<StaffTableRow | null>(null)
  const [nextRoleId, setNextRoleId] = useState("")
  const [deactivateRow, setDeactivateRow] = useState<StaffTableRow | null>(null)
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

  const confirmDeactivate = async () => {
    if (!deactivateRow || deactivateRow.kind !== "member") return
    setActionBusy(true)
    const res = await teamApi.deactivateMember(deactivateRow.id)
    setActionBusy(false)
    if (!res.success) {
      toast.error(res.error || "Failed to deactivate member")
      return
    }
    toast.success(res.message || "Team member deactivated")
    setDeactivateRow(null)
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

      <StaffTable
        title="Staff Accounts"
        rows={filtered}
        loading={loading}
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        emptyMessage="No staff accounts found."
        showActions
        canChangeRole={canChangeRole}
        canSuspend={canSuspend}
        canDeactivate={canDeactivate}
        actionBusy={actionBusy}
        onChangeRole={(staff) => {
          setRoleDialogRow(staff)
          setNextRoleId(staff.roleId || roles[0]?.id || "")
        }}
        onSuspend={(staff) => void runMemberAction(staff, "suspend")}
        onActivate={(staff) => void runMemberAction(staff, "activate")}
        onDeactivate={setDeactivateRow}
      />

      <StaffTable
        title="Former staff"
        rows={formerStaffRows}
        loading={loading}
        emptyMessage="No deactivated staff."
        lastLoginHeader="Deactivated"
      />

      {canViewLogs ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium">Team activity</h3>
            <span className="text-xs text-gray-400">Latest {activityLogs.length || 0}</span>
          </div>
          {loading && activityLogs.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading activity…
            </div>
          ) : activityLogs.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No team activity yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {activityLogs.map((log) => (
                <div key={log.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">
                      {activityActionLabel(log.action)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatLastLogin(log.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-600">
                    {log.summary ||
                      `${log.actorEmail || log.actorName || "Someone"} · ${log.subjectEmail || log.subjectName || ""}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

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

      <AlertDialog
        open={Boolean(deactivateRow)}
        onOpenChange={(open) => !open && setDeactivateRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deactivateRow?.email}</strong> from the current staff list.
              Their last role is kept on the former-staff list. This revokes their sessions
              and cannot be undone with Activate — Activate only works for suspended accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={actionBusy}
              onClick={(e) => {
                e.preventDefault()
                void confirmDeactivate()
              }}
            >
              {actionBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StaffTable({
  title,
  rows,
  loading,
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  emptyMessage,
  lastLoginHeader = "Last Login",
  showActions = false,
  canChangeRole = false,
  canSuspend = false,
  canDeactivate = false,
  actionBusy = false,
  onChangeRole,
  onSuspend,
  onActivate,
  onDeactivate,
}: {
  title: string
  rows: StaffTableRow[]
  loading: boolean
  search?: string
  onSearch?: (value: string) => void
  statusFilter?: string
  onStatusFilter?: (value: "all" | "Active" | "Pending" | "Suspended") => void
  emptyMessage: string
  lastLoginHeader?: string
  showActions?: boolean
  canChangeRole?: boolean
  canSuspend?: boolean
  canDeactivate?: boolean
  actionBusy?: boolean
  onChangeRole?: (row: StaffTableRow) => void
  onSuspend?: (row: StaffTableRow) => void
  onActivate?: (row: StaffTableRow) => void
  onDeactivate?: (row: StaffTableRow) => void
}) {
  const cols = showActions ? 6 : 5
  const showMenu = (row: StaffTableRow) =>
    row.kind === "member" && (canChangeRole || canSuspend || canDeactivate)

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium">{title}</h3>
        {onSearch && onStatusFilter ? (
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search staff"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={statusFilter}
              onChange={(e) =>
                onStatusFilter(e.target.value as "all" | "Active" | "Pending" | "Suspended")
              }
            >
              <option value="all">Status</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        ) : (
          <span className="text-xs text-gray-400">{rows.length}</span>
        )}
      </div>

      <div className="overflow-hidden">
        <div
          className={`grid gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700 ${
            cols === 6 ? "grid-cols-6" : "grid-cols-5"
          }`}
        >
          <div>Name</div>
          <div>Role</div>
          <div>Email</div>
          <div>{lastLoginHeader}</div>
          <div>Status</div>
          {showActions ? <div>Actions</div> : null}
        </div>
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading staff…
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">{emptyMessage}</p>
        ) : (
          rows.map((staff) => (
            <div
              key={staff.id}
              className={`grid gap-4 p-4 border-b border-gray-100 last:border-b-0 text-sm items-center ${
                cols === 6 ? "grid-cols-6" : "grid-cols-5"
              }`}
            >
              <div className="font-medium">{staff.name}</div>
              <div>{staff.role}</div>
              <div className="truncate">{staff.email}</div>
              <div>{staff.lastLogin}</div>
              <div>
                <Badge className={statusColor(staff.status)}>{staff.status}</Badge>
              </div>
              {showActions ? (
                <div>
                  {showMenu(staff) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={actionBusy}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canChangeRole ? (
                          <DropdownMenuItem onClick={() => onChangeRole?.(staff)}>
                            Change role
                          </DropdownMenuItem>
                        ) : null}
                        {canSuspend && staff.status === "Suspended" ? (
                          <DropdownMenuItem onClick={() => onActivate?.(staff)}>
                            Activate
                          </DropdownMenuItem>
                        ) : null}
                        {canSuspend && staff.status !== "Suspended" ? (
                          <DropdownMenuItem onClick={() => onSuspend?.(staff)}>
                            Suspend
                          </DropdownMenuItem>
                        ) : null}
                        {canDeactivate ? (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onDeactivate?.(staff)}
                          >
                            Deactivate
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : staff.kind === "invitation" ? (
                    <span className="text-xs text-gray-400">Invite pending</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
