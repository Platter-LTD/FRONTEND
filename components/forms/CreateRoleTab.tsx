"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Edit, Trash2, Loader2, RefreshCw } from "lucide-react"
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
  hasAnyPermission,
  isStandardRoleName,
  permissionLabel,
  TEAM_PERMISSIONS,
} from "@/lib/teamPermissions"
import { useAppSelector } from "@/store/hooks"
import { toast } from "sonner"

export interface CreateRoleTabProps {
  onCreateRole?: () => void
  onEditRole?: (role: MerchantRole) => void
  team: MerchantTeamState
}

export function CreateRoleTab({ onCreateRole, onEditRole, team }: CreateRoleTabProps) {
  const { roles, catalog, loading, error, refetch } = team
  const sessionPermissions = useAppSelector((s) => s.auth.permissions)
  const canManageRoles = hasAnyPermission(
    [...TEAM_PERMISSIONS.manageRoles],
    sessionPermissions,
  )
  const canEnsureDefaults = hasAnyPermission(
    [...TEAM_PERMISSIONS.ensureDefaults],
    sessionPermissions,
  )

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

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">Roles</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search roles"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div>Name of roles</div>
            <div>created by</div>
            <div>Permissions</div>
            <div>Actions</div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading roles…
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No roles yet.</p>
          ) : (
            filtered.map((role) => {
              const standard = isStandardRoleName(role.name)
              return (
                <div
                  key={role.id}
                  className="grid grid-cols-4 gap-4 p-4 border-b border-gray-100 last:border-b-0 text-sm items-center"
                >
                  <div className="font-medium">{role.name}</div>
                  <div>Admin</div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#9A813F] border-[#9A813F] bg-transparent"
                      onClick={() => setViewRole(role)}
                    >
                      View permission
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageRoles ? (
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => onEditRole?.(role)}
                        aria-label={`Edit ${role.name}`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    ) : null}
                    {canManageRoles && !standard ? (
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-600"
                        onClick={() => setDeleteRole(role)}
                        aria-label={`Delete ${role.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
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
