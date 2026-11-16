"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Users, Loader2 } from "lucide-react"
import { Drawer } from "@/components/drawer"
import TextInput from "@/components/text-input"
import type { MerchantRole } from "@/lib/services/teamService"
import { toast } from "sonner"
import { useTeamActions, useTeamRoles } from "@/hooks/queries/team"

interface AddStaffDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (email: string) => void
  /** Preloaded roles; if omitted, drawer fetches on open. */
  roles?: MerchantRole[]
}

const NO_ROLES: MerchantRole[] = []

export function AddStaffDrawer({
  open,
  onOpenChange,
  onSuccess,
  roles: rolesProp,
}: AddStaffDrawerProps) {
  // Use the roles passed in when there are any; otherwise load them (cached) while the drawer is open.
  const hasRolesProp = Boolean(rolesProp && rolesProp.length > 0)
  const rolesQuery = useTeamRoles(open && !hasRolesProp)
  const roles: MerchantRole[] = hasRolesProp ? (rolesProp as MerchantRole[]) : (rolesQuery.data ?? NO_ROLES)
  const loadingRoles = open && !hasRolesProp && rolesQuery.isPending
  const teamActions = useTeamActions()
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [staffEmail, setStaffEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Default the role picker to the first role once roles are available.
  useEffect(() => {
    if (open && roles[0]) setSelectedRoleId((prev) => prev || roles[0].id)
  }, [open, roles])

  useEffect(() => {
    if (rolesQuery.error) toast.error(rolesQuery.error.message || "Failed to load roles")
  }, [rolesQuery.error])

  const handleInvite = async () => {
    const email = staffEmail.trim()
    if (!email) {
      toast.error("Email is required")
      return
    }
    if (!selectedRoleId) {
      toast.error("Select a role")
      return
    }
    setSubmitting(true)
    const res = await teamActions.createInvitation({ email, roleId: selectedRoleId })
    setSubmitting(false)
    if (!res.success) {
      toast.error(res.error || "Failed to send invitation")
      return
    }
    onSuccess(email)
    setStaffEmail("")
    setSelectedRoleId(roles[0]?.id || "")
    onOpenChange(false)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Add Staff"
      subtitle="Invite a team member by email and role"
    >
      <div className="space-y-6">
        <div className="w-12 h-12 bg-[#E0D8C3] rounded-full flex items-center justify-center mx-auto">
          <Users className="w-6 h-6 text-[#9A813F]" />
        </div>

        <TextInput
          label="Staff Email Address"
          placeholder="Enter staff email address"
          value={staffEmail}
          onChange={setStaffEmail}
          type="email"
          accentColor="#9A813F"
        />

        <div className="space-y-3">
          <label className="text-sm text-gray-600">Select Role</label>
          {loadingRoles ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading roles…
            </div>
          ) : roles.length === 0 ? (
            <p className="text-sm text-amber-700">
              No roles yet. Create a role first, then invite staff.
            </p>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={role.id}
                    checked={selectedRoleId === role.id}
                    onChange={() => setSelectedRoleId(role.id)}
                    className="w-4 h-4 text-[#9A813F] border-gray-300 focus:ring-[#9A813F]"
                  />
                  <span className="text-sm text-gray-700">{role.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="text-sm text-[#9A813F] flex items-center disabled:opacity-50"
          disabled={submitting}
          onClick={() => {
            setStaffEmail("")
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Clear email for another invite
        </button>

        <Button
          className="w-full bg-black text-white hover:bg-gray-800"
          onClick={() => void handleInvite()}
          disabled={submitting || roles.length === 0}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            "Invite"
          )}
        </Button>
      </div>
    </Drawer>
  )
}
