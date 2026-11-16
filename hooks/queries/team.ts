"use client"

import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { teamApi, type TeamApiResult, type TeamMemberListStatus } from "@/lib/services/teamService"

/** teamApi never throws; turn `{ success: false }` into a thrown error so React Query tracks it. */
async function unwrap<T>(promise: Promise<TeamApiResult<T>>): Promise<T> {
  const res = await promise
  if (!res.success) throw new Error(res.error || res.message || "Request failed")
  return res.data as T
}

export const teamKeys = {
  all: ["team"] as QueryKey,
  roles: ["team", "roles"] as QueryKey,
  permissions: ["team", "permissions"] as QueryKey,
  members: (status?: TeamMemberListStatus) => ["team", "members", status ?? "current"] as QueryKey,
  invitations: ["team", "invitations"] as QueryKey,
  activityLogs: (opts: { limit?: number; skip?: number }) => ["team", "activity-logs", opts] as QueryKey,
  invitation: (token: string) => ["invitation", token] as QueryKey,
}

export function useTeamRoles(enabled = true) {
  return useQuery({ queryKey: teamKeys.roles, queryFn: () => unwrap(teamApi.listRoles()), enabled })
}

export function useTeamPermissions(enabled = true) {
  return useQuery({ queryKey: teamKeys.permissions, queryFn: () => unwrap(teamApi.listPermissions()), enabled })
}

export function useTeamMembers(status?: TeamMemberListStatus, enabled = true) {
  return useQuery({ queryKey: teamKeys.members(status), queryFn: () => unwrap(teamApi.listMembers(status)), enabled })
}

export function useTeamInvitations(enabled = true) {
  return useQuery({ queryKey: teamKeys.invitations, queryFn: () => unwrap(teamApi.listInvitations()), enabled })
}

export function useTeamActivityLogs(opts: { limit?: number; skip?: number } = { limit: 50, skip: 0 }, enabled = true) {
  return useQuery({
    queryKey: teamKeys.activityLogs(opts),
    queryFn: () => unwrap(teamApi.listActivityLogs(opts)),
    enabled,
  })
}

/** Public: details for an invitation token (accept-invitation page). */
export function useInvitation(token: string | null | undefined) {
  return useQuery({
    queryKey: teamKeys.invitation(token ?? ""),
    queryFn: () => teamApi.validateInvitation(token as string),
    enabled: Boolean(token),
    retry: false,
  })
}

type TeamApi = typeof teamApi
type Writes =
  | "changeMemberRole"
  | "suspendMember"
  | "activateMember"
  | "deactivateMember"
  | "ensureDefaultRoles"
  | "createRole"
  | "updateRole"
  | "deleteRole"
  | "createInvitation"
  | "acceptInvitation"

/**
 * Team writes with the same signatures and `{ success, data, error }` results as teamApi, run as
 * React Query mutations; a successful write refreshes every team query.
 */
export function useTeamActions(): Pick<TeamApi, Writes> & { isPending: boolean } {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ run }: { run: () => Promise<TeamApiResult<unknown>> }) => run(),
    onSuccess: (res) => {
      if (res.success) void queryClient.invalidateQueries({ queryKey: teamKeys.all })
    },
  })

  return useMemo(() => {
    const wrap =
      <K extends Writes>(name: K) =>
      ((...args: Parameters<TeamApi[K]>) =>
        mutation.mutateAsync({
          run: () => (teamApi[name] as (...a: Parameters<TeamApi[K]>) => Promise<TeamApiResult<unknown>>)(...args),
        })) as unknown as TeamApi[K]
    return {
      changeMemberRole: wrap("changeMemberRole"),
      suspendMember: wrap("suspendMember"),
      activateMember: wrap("activateMember"),
      deactivateMember: wrap("deactivateMember"),
      ensureDefaultRoles: wrap("ensureDefaultRoles"),
      createRole: wrap("createRole"),
      updateRole: wrap("updateRole"),
      deleteRole: wrap("deleteRole"),
      createInvitation: wrap("createInvitation"),
      acceptInvitation: wrap("acceptInvitation"),
      isPending: mutation.isPending,
    }
    // mutateAsync is stable; isPending drives re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.isPending])
}
