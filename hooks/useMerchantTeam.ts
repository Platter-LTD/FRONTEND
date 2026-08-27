"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  mergeStaffTableRows,
  staffCounts,
  teamApi,
  type MerchantRole,
  type StaffTableRow,
  type TeamInvitation,
  type TeamMember,
} from "@/lib/services/teamService"
import type { PermissionCatalogItem } from "@/lib/teamPermissions"

export type MerchantTeamState = {
  members: TeamMember[]
  invitations: TeamInvitation[]
  roles: MerchantRole[]
  /** Full catalog from GET /roles/permissions */
  catalog: PermissionCatalogItem[]
  /** All permission codes (incl. legacy) */
  permissions: string[]
  staffRows: StaffTableRow[]
  counts: { total: number; active: number; inactive: number }
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMerchantTeam(): MerchantTeamState {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [roles, setRoles] = useState<MerchantRole[]>([])
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Roles first — seeds Admin / Manager / Support Staff on first call.
      const rolesRes = await teamApi.listRoles()
      if (!rolesRes.success) {
        setError(rolesRes.error || "Failed to load roles")
        setRoles([])
      } else {
        setRoles(rolesRes.data || [])
      }

      const [permRes, membersRes, invitesRes] = await Promise.all([
        teamApi.listPermissions(),
        teamApi.listMembers(),
        teamApi.listInvitations(),
      ])

      if (permRes.success && permRes.data) {
        setCatalog(permRes.data.catalog)
        setPermissions(permRes.data.permissions)
      } else {
        setCatalog([])
        setPermissions([])
      }

      if (membersRes.success) {
        setMembers(membersRes.data || [])
      } else {
        setMembers([])
      }

      if (invitesRes.success) {
        setInvitations(invitesRes.data || [])
      } else {
        setInvitations([])
      }

      const firstError =
        (!rolesRes.success && rolesRes.error) ||
        (!membersRes.success && membersRes.error) ||
        (!invitesRes.success && invitesRes.error) ||
        null
      if (firstError) setError(firstError)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load team data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const staffRows = useMemo(
    () => mergeStaffTableRows(members, invitations, roles),
    [members, invitations, roles],
  )

  const counts = useMemo(() => staffCounts(staffRows), [staffRows])

  return {
    members,
    invitations,
    roles,
    catalog,
    permissions,
    staffRows,
    counts,
    loading,
    error,
    refetch,
  }
}
