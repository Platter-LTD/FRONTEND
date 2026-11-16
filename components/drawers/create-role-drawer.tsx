"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Drawer } from "@/components/drawer"
import TextInput from "@/components/text-input"
import type { MerchantRole } from "@/lib/services/teamService"
import {
  groupPrimaryPermissions,
  permissionLabel,
  type PermissionCatalogItem,
} from "@/lib/teamPermissions"
import { toast } from "sonner"
import { useTeamActions, useTeamPermissions } from "@/hooks/queries/team"

interface CreateRoleDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (roleName: string) => void
  /** When set, drawer updates this role instead of creating. */
  editRole?: MerchantRole | null
  /** Prefer catalog with primary:true grouped by category. */
  catalog?: PermissionCatalogItem[]
}

const NO_PERMISSIONS: PermissionCatalogItem[] = []

export function CreateRoleDrawer({
  open,
  onOpenChange,
  onSuccess,
  editRole,
  catalog: catalogProp,
}: CreateRoleDrawerProps) {
  const [roleName, setRoleName] = React.useState("")
  const [description, setDescription] = React.useState("")
  // Use the catalog passed in when it has rows; otherwise load it (cached) while the drawer is open.
  const hasCatalogProp = Boolean(catalogProp && catalogProp.length > 0)
  const permissionsQuery = useTeamPermissions(open && !hasCatalogProp)
  const catalog: PermissionCatalogItem[] = hasCatalogProp
    ? (catalogProp as PermissionCatalogItem[])
    : (permissionsQuery.data?.catalog ?? NO_PERMISSIONS)
  const loadingPerms = open && !hasCatalogProp && permissionsQuery.isPending
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const isEdit = Boolean(editRole?.id)
  const teamActions = useTeamActions()

  const groups = useMemo(() => groupPrimaryPermissions(catalog), [catalog])

  useEffect(() => {
    if (permissionsQuery.error) toast.error(permissionsQuery.error.message || "Failed to load permissions")
  }, [permissionsQuery.error])

  useEffect(() => {
    if (!open) return
    if (editRole) {
      setRoleName(editRole.name || "")
      setDescription(editRole.description || "")
      setSelected(new Set(editRole.permissions || []))
    } else {
      setRoleName("")
      setDescription("")
      setSelected(new Set())
    }
  }, [open, editRole])

  const togglePermission = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const handleSubmit = async () => {
    const name = roleName.trim()
    if (!name) {
      toast.error("Role name is required")
      return
    }
    const perms = Array.from(selected)
    if (perms.length === 0) {
      toast.error("Select at least one permission")
      return
    }
    setSubmitting(true)
    const payload = {
      name,
      description: description.trim(),
      permissions: perms,
    }
    const res = isEdit && editRole
      ? await teamActions.updateRole(editRole.id, payload)
      : await teamActions.createRole(payload)
    setSubmitting(false)
    if (!res.success) {
      toast.error(res.error || (isEdit ? "Failed to update role" : "Failed to create role"))
      return
    }
    onSuccess(name)
    onOpenChange(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Role" : "Create Role"}
      subtitle="Define name, description, and permissions"
    >
      <div className="space-y-6">
        <TextInput
          label="Name of role"
          placeholder="e.g. Financial Manager"
          value={roleName}
          onChange={setRoleName}
          accentColor="#9A813F"
        />

        <TextInput
          label="Role Description"
          placeholder="Short description"
          value={description}
          onChange={setDescription}
          accentColor="#9A813F"
        />

        <div className="space-y-3">
          <label className="text-sm text-gray-600">Select permissions</label>
          {loadingPerms ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading permissions…
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-500">No permissions available.</p>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {groups.map((group) => (
                <div key={group.category}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <label
                        key={item.code}
                        className="flex items-center gap-3 cursor-pointer py-1"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(item.code)}
                          onChange={() => togglePermission(item.code)}
                          className="w-4 h-4 rounded border-gray-300 text-[#9A813F] focus:ring-[#9A813F]"
                        />
                        <span className="text-sm text-gray-700">
                          {item.label || permissionLabel(item.code, catalog)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          className="w-full bg-black text-white hover:bg-gray-800"
          onClick={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEdit ? "Saving…" : "Creating…"}
            </>
          ) : isEdit ? (
            "Save Role"
          ) : (
            "Create Role"
          )}
        </Button>
      </div>
    </Drawer>
  )
}
