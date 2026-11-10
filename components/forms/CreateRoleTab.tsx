"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Loader2, RefreshCw, Eye } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { rowActionsColumn, type RowAction } from "@/components/ui/row-actions"
import {
  Dialog,
  DialogContent,
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
import { teamApi, type MerchantRole } from "@/lib/services/teamService"
import {
  isStandardRoleName,
  permissionLabel,
  TEAM_PERMISSIONS,
} from "@/lib/teamPermissions"
import { usePermissions } from "@/hooks/usePermissions"
import { toast } from "sonner"

export interface CreateRoleTabProps {
  onCreateRole?: () => void
  onEditRole?: (role: MerchantRole) => void
  team: MerchantTeamState
}

export function CreateRoleTab({ onCreateRole, onEditRole, team }: CreateRoleTabProps) {
  const { roles, catalog, loading, error, refetch } = team
  const { can } = usePermissions()
  const canManageRoles = can([...TEAM_PERMISSIONS.manageRoles])
  const canEnsureDefaults = can([...TEAM_PERMISSIONS.ensureDefaults])

  const [search, setSearch] = useState("")
  const [viewRole, setViewRole] = useState<MerchantRole | null>(null)
  const [deleteRole, setDeleteRole] = useState<MerchantRole | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roles
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q),
    )
  }, [roles, search])

  const confirmDelete = async () => {
    if (!deleteRole) return
    if (isStandardRoleName(deleteRole.name)) {
      toast.error("Cannot delete standard roles (Admin, Manager, Support Staff)")
      setDeleteRole(null)
      return
    }
    setDeleting(true)
    const res = await teamApi.deleteRole(deleteRole.id)
    setDeleting(false)
    if (!res.success) {
      toast.error(res.error || "Failed to delete role")
      return
    }
    toast.success(res.message || "Role deleted")
    setDeleteRole(null)
    void refetch()
  }

  const runEnsureDefaults = async (sync: boolean) => {
    setSeeding(true)
    const res = await teamApi.ensureDefaultRoles(sync)
    setSeeding(false)
    if (!res.success) {
      toast.error(res.error || "Failed to ensure default roles")
      return
    }
    toast.success(
      res.message ||
        (sync
          ? "Standard roles synced to spreadsheet presets"
          : "Missing standard roles created"),
    )
    void refetch()
  }

  type RoleRow = (typeof filtered)[number]
  const roleColumns: ColumnDef<RoleRow, unknown>[] = [
    { accessorKey: "name", header: "Name of roles", cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span> },
    { id: "createdBy", header: "Created by", accessorFn: () => "Admin" },
    {
      id: "permissions",
      header: "Permissions",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" className="border-[#9A813F] bg-transparent text-[#9A813F]" onClick={() => setViewRole(row.original)}>
          View permission
        </Button>
      ),
    },
    rowActionsColumn<RoleRow>((role) => {
      const actions: RowAction<RoleRow>[] = [{ label: "View permissions", icon: Eye, onClick: (r) => setViewRole(r) }]
      if (canManageRoles) actions.push({ label: "Edit role", icon: Edit, onClick: (r) => onEditRole?.(r) })
      if (canManageRoles && !isStandardRoleName(role.name))
        actions.push({ label: "Delete role", icon: Trash2, destructive: true, onClick: (r) => setDeleteRole(r) })
      return actions
    }),
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {canEnsureDefaults ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={seeding}
                onClick={() => void runEnsureDefaults(false)}
              >
                {seeding ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Ensure defaults
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={seeding}
                className="text-xs text-gray-600"
                onClick={() => void runEnsureDefaults(true)}
                title="Reset Admin / Manager / Support Staff permissions to spreadsheet presets"
              >
                Sync presets
              </Button>
            </>
          ) : null}
        </div>
        {canManageRoles ? (
          <Button className="bg-black text-white hover:bg-gray-800" onClick={onCreateRole}>
            <Plus className="w-4 h-4 mr-2" />
            Create roles
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {error}
        </p>
      ) : null}

            <DataTable
        tableId="roles"
        onRefresh={() => void refetch()}
        title="Roles"
        columns={roleColumns}
        data={filtered}
        isLoading={loading}
        onSearch={setSearch}
        initialSearch={search}
        searchPlaceholder="Search roles"
        download
        resetPageSignal={search}
        empty="No roles yet."
      />

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

      <AlertDialog
        open={Boolean(deleteRole)}
        onOpenChange={(open) => !open && setDeleteRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteRole?.name}</strong>? This fails if staff are still assigned
              to this role — reassign them first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
