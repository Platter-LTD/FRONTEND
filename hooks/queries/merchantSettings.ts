"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchWithAuth } from "@/lib/fetchWithAuth"
import { BACKEND } from "@/lib/endpoints"
import type { AuthUser, SessionDto } from "@/types/auth"

export const merchantSettingsKeys = {
  profile: ["merchant", "profile"] as const,
  sessions: ["merchant", "sessions"] as const,
}

function apiError(res: Response, json: unknown): Error {
  const j = json as { error?: string; message?: string }
  const msg = j?.error ?? j?.message
  return new Error(typeof msg === "string" && msg.trim() ? msg.trim() : `Request failed (${res.status})`)
}

/** Call a JSON endpoint; throws the API's error message on a non-2xx response. */
async function request(url: string, init: RequestInit): Promise<unknown> {
  const res = await fetchWithAuth(url, init)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw apiError(res, json)
  return json
}

export type MerchantProfile = {
  profile: AuthUser | null
  fullName: string
  currentEmail: string
  phone: string
  country: string
}

function mapProfile(json: unknown): MerchantProfile {
  const dataAny = (json as { data?: unknown })?.data ?? json
  const d = dataAny as Record<string, unknown>
  const firstName = d?.first_name ?? d?.firstName ?? d?.first
  const lastName = d?.last_name ?? d?.lastName ?? d?.last
  const emailValue = d?.email ?? (d?.user as Record<string, unknown>)?.email ?? ""
  const phoneValue = d?.phone ?? d?.phone_number ?? d?.phoneNumber ?? ""
  const countryValue = d?.country ?? d?.country_code ?? d?.countryCode ?? ""
  return {
    profile: dataAny as AuthUser,
    fullName: [firstName, lastName]
      .filter((v) => typeof v === "string" && (v as string).trim().length > 0)
      .join(" "),
    currentEmail: String(emailValue ?? ""),
    phone: String(phoneValue ?? "").replace(/^\+\d+/, ""),
    country: String(countryValue ?? "").toLowerCase(),
  }
}

function parseSessions(json: unknown): SessionDto[] {
  const j = json as Record<string, any>
  const list =
    (Array.isArray(j?.data?.sessions) ? j.data.sessions : undefined) ??
    (Array.isArray(j?.data?.data?.sessions) ? j.data.data.sessions : undefined) ??
    (Array.isArray(j?.data) ? j.data : undefined) ??
    (Array.isArray(j?.sessions) ? j.sessions : undefined) ??
    []
  return Array.isArray(list) ? (list as SessionDto[]) : []
}

/** Signed-in merchant's profile (GET /user/profile). Shared by the sidebar and settings page. */
export function useMerchantProfile(enabled = true) {
  return useQuery({
    queryKey: merchantSettingsKeys.profile,
    queryFn: async () => mapProfile(await request(BACKEND.user.profile, { method: "GET" })),
    enabled,
  })
}

/** Active login sessions (GET /sessions). */
export function useMerchantSessions(enabled = true) {
  return useQuery({
    queryKey: merchantSettingsKeys.sessions,
    queryFn: async () => parseSessions(await request(BACKEND.sessions.list, { method: "GET" })),
    enabled,
  })
}

const NO_SESSIONS: SessionDto[] = []

/**
 * Everything the account settings page needs: server data from React Query, the editable form
 * fields as local state (seeded from the profile), and the write actions as mutations.
 */
export function useMerchantSettings(options: { sessionsEnabled: boolean }) {
  const queryClient = useQueryClient()
  const profileQuery = useMerchantProfile()
  const sessionsQuery = useMerchantSessions(options.sessionsEnabled)

  const [account, setAccount] = useState({ fullName: "", phone: "", country: "" })
  const [email, setEmail] = useState({ newEmail: "", confirmEmail: "", emailCurrentPassword: "" })
  const [password, setPassword] = useState({ passwordCurrent: "", passwordNew: "", passwordConfirm: "" })

  // Refill the account form whenever a fresh profile arrives (as the old slice did on fetch).
  useEffect(() => {
    const p = profileQuery.data
    if (p) setAccount({ fullName: p.fullName, phone: p.phone, country: p.country })
  }, [profileQuery.data])

  const refreshProfile = () => queryClient.invalidateQueries({ queryKey: merchantSettingsKeys.profile })

  const updateProfile = useMutation({
    mutationFn: (body: { first_name: string; last_name: string; phone: string; country: string }) =>
      request(BACKEND.user.updateProfile, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: refreshProfile,
  })
  const updateEmail = useMutation({
    mutationFn: (body: { newEmail: string; confirmEmail: string; currentPassword: string }) =>
      request(BACKEND.user.updateEmail, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: async () => {
      setEmail({ newEmail: "", confirmEmail: "", emailCurrentPassword: "" })
      await refreshProfile()
    },
  })
  const changePassword = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      request(BACKEND.password.change, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => setPassword({ passwordCurrent: "", passwordNew: "", passwordConfirm: "" }),
  })
  const revokeSession = useMutation({
    mutationFn: (sessionId: string) => request(BACKEND.sessions.revoke(sessionId), { method: "DELETE" }),
    onSuccess: (_res, sessionId) =>
      queryClient.setQueryData<SessionDto[]>(merchantSettingsKeys.sessions, (prev) =>
        (prev ?? []).filter((s) => (s as { id?: string }).id !== sessionId),
      ),
  })
  const deactivate = useMutation({
    mutationFn: () => request(BACKEND.user.deactivate, { method: "POST", body: JSON.stringify({}) }),
  })

  const setAccountFields = useCallback(
    (p: Partial<typeof account>) => setAccount((prev) => ({ ...prev, ...p })),
    [],
  )
  const setEmailFields = useCallback((p: Partial<typeof email>) => setEmail((prev) => ({ ...prev, ...p })), [])
  const setPasswordFields = useCallback(
    (p: Partial<typeof password>) => setPassword((prev) => ({ ...prev, ...p })),
    [],
  )

  return useMemo(
    () => ({
      profile: profileQuery.data?.profile ?? null,
      currentEmail: profileQuery.data?.currentEmail ?? "",
      ...account,
      ...email,
      ...password,
      sessions: sessionsQuery.data ?? NO_SESSIONS,
      profileLoading: profileQuery.isFetching,
      profileError: profileQuery.error,
      profileSaving: updateProfile.isPending,
      emailSaving: updateEmail.isPending,
      passwordSaving: changePassword.isPending,
      sessionsLoading: sessionsQuery.isFetching,
      deactivating: deactivate.isPending,
      setAccountFields,
      setEmailFields,
      setPasswordFields,
      updateProfile: updateProfile.mutateAsync,
      updateEmail: updateEmail.mutateAsync,
      changePassword: changePassword.mutateAsync,
      revokeSession: revokeSession.mutateAsync,
      deactivateAccount: deactivate.mutateAsync,
      refetchProfile: profileQuery.refetch,
      refetchSessions: sessionsQuery.refetch,
    }),
    [
      profileQuery.data,
      profileQuery.isFetching,
      profileQuery.error,
      profileQuery.refetch,
      account,
      email,
      password,
      sessionsQuery.data,
      sessionsQuery.isFetching,
      sessionsQuery.refetch,
      updateProfile.isPending,
      updateProfile.mutateAsync,
      updateEmail.isPending,
      updateEmail.mutateAsync,
      changePassword.isPending,
      changePassword.mutateAsync,
      revokeSession.mutateAsync,
      deactivate.isPending,
      deactivate.mutateAsync,
      setAccountFields,
      setEmailFields,
      setPasswordFields,
    ],
  )
}
