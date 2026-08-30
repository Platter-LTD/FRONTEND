"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  formerMemberRows,
  mergeStaffTableRows,
  staffCountsFromMembers,
  teamApi,
  type MerchantRole,
  type StaffTableRow,
  type TeamActivityLog,
  type TeamInvitation,
  type TeamMember,
} from "@/lib/services/teamService"
import type { PermissionCatalogItem } from "@/lib/teamPermissions"

export type MerchantTeamState = {
  members: TeamMember[]
  formerMembers: TeamMember[]
  invitations: TeamInvitation[]
  roles: MerchantRole[]
  catalog: PermissionCatalogItem[]
  permissions: string[]
  staffRows: StaffTableRow[]
  formerStaffRows: StaffTableRow[]
  activityLogs: TeamActivityLog[]
  counts: { total: number; active: number; inactive: number }
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMerchantTeam(): MerchantTeamState {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [formerMembers, setFormerMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [roles, setRoles] = useState<MerchantRole[]>([])
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [activityLogs, setActivityLogs] = useState<TeamActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rolesRes = await teamApi.listRoles()
      if (!rolesRes.success) {
        setError(rolesRes.error || "Failed to load roles")
        setRoles([])
      } else {
        setRoles(rolesRes.data || [])
      }

      const [permRes, membersRes, formerRes, invitesRes, logsRes] = await Promise.all([
        teamApi.listPermissions(),
        teamApi.listMembers(),
        teamApi.listMembers("deactivated"),
        teamApi.listInvitations(),
        teamApi.listActivityLogs({ limit: 50, skip: 0 }),
      ])

      if (permRes.success && permRes.data) {
        setCatalog(permRes.data.catalog)
        setPermissions(permRes.data.permissions)
      } else {
        setCatalog([])
        setPermissions([])
      }

      setMembers(membersRes.success ? membersRes.data || [] : [])
      setFormerMembers(formerRes.success ? formerRes.data || [] : [])
      setInvitations(invitesRes.success ? invitesRes.data || [] : [])
      setActivityLogs(logsRes.success ? logsRes.data?.logs || [] : [])

      const firstError =
        (!rolesRes.success && rolesRes.error) ||
        (!membersRes.success && membersRes.error) ||
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

  const formerStaffRows = useMemo(
    () => formerMemberRows(formerMembers, roles),
    [formerMembers, roles],
  )

  const counts = useMemo(() => staffCountsFromMembers(members), [members])

  return {
    members,
    formerMembers,
    invitations,
    roles,
    catalog,
    permissions,
    staffRows,
    formerStaffRows,
    activityLogs,
    counts,
    loading,
    error,
    refetch,
  }
}
