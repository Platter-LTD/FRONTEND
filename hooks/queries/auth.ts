"use client"

import { apiClient, type ApiRequestConfig } from "@/lib/api"
import { useServiceMutations } from "@/lib/query/useServiceMutations"

/**
 * Public auth-flow requests (registration, OTP send/verify, password forgot/reset) as React Query
 * mutations. Same call shape as apiClient.post / apiClient.get; nothing is cached for these.
 */
export function useAuthActions() {
  return useServiceMutations(
    {
      post: <T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig) => apiClient.post<T>(url, data, config),
      get: <T = unknown>(url: string, config?: ApiRequestConfig) => apiClient.get<T>(url, config),
    },
    [],
  )
}
