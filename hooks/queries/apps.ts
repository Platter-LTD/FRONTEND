"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createApp, fetchAppsList } from "@/lib/gateway/apps"
import { readJson } from "@/lib/gateway/response"
import { invalidateDashboardApps } from "@/lib/dashboardSessionCache"
import { queryKeys } from "@/lib/query/keys"

/** All apps for the signed-in merchant (cached; shared by sidebar, header and app lists). */
export function useApps(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.apps.list(),
    queryFn: fetchAppsList,
    enabled: options?.enabled ?? true,
  })
}

/** Create an app, then refresh every app list. Resolves to the created app. */
export function useCreateApp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await createApp(input)
      const body = await readJson(res)
      if (!res.ok || body?.success === false) {
        const message = body?.error || body?.message || body?.details?.message || "Failed to create app"
        throw Object.assign(new Error(message), { status: res.status, details: body?.details })
      }
      return body.data
    },
    onSuccess: () => {
      invalidateDashboardApps()
      void queryClient.invalidateQueries({ queryKey: queryKeys.apps.list() })
    },
  })
}
