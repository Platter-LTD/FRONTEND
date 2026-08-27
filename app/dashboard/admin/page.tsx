"use client"

import Tabs from "@/components/Tabs"
import { useState } from "react"
import { toast } from "sonner"
import { AddStaffTab } from "@/components/forms/AddStaffTab"
import { ManageRoleTab } from "@/components/forms/ManageRoleTab"
import { CreateRoleTab } from "@/components/forms/CreateRoleTab"
import { AddStaffDrawer } from "@/components/drawers/add-staff-drawer"
import { CreateRoleDrawer } from "@/components/drawers/create-role-drawer"
import { InviteSuccessfulDrawer } from "@/components/drawers/invite-successful-drawer"
import { RoleCreatedSuccessDrawer } from "@/components/drawers/role-created-success-drawer"
import { useMerchantTeam } from "@/hooks/useMerchantTeam"
import type { MerchantRole } from "@/lib/services/teamService"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("add-staff")
  const team = useMerchantTeam()

  const [addStaffOpen, setAddStaffOpen] = useState(false)
  const [createRoleOpen, setCreateRoleOpen] = useState(false)
  const [editRole, setEditRole] = useState<MerchantRole | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteSuccessOpen, setInviteSuccessOpen] = useState(false)
  const [roleCreatedName, setRoleCreatedName] = useState("")
  const [roleSuccessOpen, setRoleSuccessOpen] = useState(false)

  const tabs = [
    { id: "add-staff", label: "Add staff" },
    { id: "manage-role", label: "Manage role" },
    { id: "create-role", label: "Create Role" },
  ]

  const openCreateRole = () => {
    setEditRole(null)
    setCreateRoleOpen(true)
  }

  const openEditRole = (role: MerchantRole) => {
    setEditRole(role)
    setCreateRoleOpen(true)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "add-staff":
        return <AddStaffTab team={team} onAddStaff={() => setAddStaffOpen(true)} />
      case "manage-role":
        return <ManageRoleTab team={team} />
      case "create-role":
        return (
          <CreateRoleTab
            team={team}
            onCreateRole={openCreateRole}
            onEditRole={openEditRole}
          />
        )
      default:
        return <AddStaffTab team={team} onAddStaff={() => setAddStaffOpen(true)} />
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-4">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">{renderTabContent()}</div>

      <AddStaffDrawer
        open={addStaffOpen}
        onOpenChange={setAddStaffOpen}
        roles={team.roles}
        onSuccess={(email) => {
          setInviteEmail(email)
          setInviteSuccessOpen(true)
          void team.refetch()
        }}
      />

      <CreateRoleDrawer
        open={createRoleOpen}
        onOpenChange={(open) => {
          setCreateRoleOpen(open)
          if (!open) setEditRole(null)
        }}
        editRole={editRole}
        catalog={team.catalog}
        onSuccess={(roleName) => {
          setRoleCreatedName(roleName)
          if (editRole) toast.success("Role updated")
          else setRoleSuccessOpen(true)
          void team.refetch()
        }}
      />

      <InviteSuccessfulDrawer
        open={inviteSuccessOpen}
        onOpenChange={setInviteSuccessOpen}
        email={inviteEmail}
      />

      <RoleCreatedSuccessDrawer
        open={roleSuccessOpen}
        onOpenChange={setRoleSuccessOpen}
        roleName={roleCreatedName}
      />
    </div>
  )
}
