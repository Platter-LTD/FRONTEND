"use client"

import { useCallback, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  formerMemberRows,
  mergeStaffTableRows,
  staffCountsFromMembers,
  type MerchantRole,
  type StaffTableRow,
  type TeamActivityLog,
  type TeamInvitation,
  type TeamMember,
} from "@/lib/services/teamService"
import type { PermissionCatalogItem } from "@/lib/teamPermissions"
import {
  teamKeys,
  useTeamActivityLogs,
  useTeamInvitations,
  useTeamMembers,
  useTeamPermissions,
  useTeamRoles,
} from "@/hooks/queries/team"

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

/** Stable empty fallback so memoized derivations don't recompute every render while loading. */
const EMPTY: never[] = []

export function useMerchantTeam(): MerchantTeamState {
  const queryClient = useQueryClient()
  const rolesQ = useTeamRoles()
  const permissionsQ = useTeamPermissions()
  const membersQ = useTeamMembers()
  const formerQ = useTeamMembers("deactivated")
  const invitationsQ = useTeamInvitations()
  const logsQ = useTeamActivityLogs({ limit: 50, skip: 0 })

  const roles: MerchantRole[] = rolesQ.data ?? EMPTY
  const members: TeamMember[] = membersQ.data ?? EMPTY
  const formerMembers: TeamMember[] = formerQ.data ?? EMPTY
  const invitations: TeamInvitation[] = invitationsQ.data ?? EMPTY
  const activityLogs: TeamActivityLog[] = logsQ.data?.logs ?? EMPTY
  const catalog: PermissionCatalogItem[] = permissionsQ.data?.catalog ?? EMPTY
  const permissions: string[] = permissionsQ.data?.permissions ?? EMPTY

  const loading = [rolesQ, permissionsQ, membersQ, formerQ, invitationsQ, logsQ].some((q) => q.isPending)
  const error = rolesQ.error?.message || membersQ.error?.message || null

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: teamKeys.all })
  }, [queryClient])

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
