import { QueryClient, isServer } from "@tanstack/react-query"
import { isAxiosError } from "axios"

/** HTTP status from an axios error or a thrown Response-like error, if any. */
function errorStatus(error: unknown): number | undefined {
  if (isAxiosError(error)) return error.response?.status
  const status = (error as { status?: unknown })?.status
  return typeof status === "number" ? status : undefined
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dashboard data: reuse cached results for a minute before refetching in the background.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        // 4xx (auth, validation, not found) will not succeed on retry; network/5xx get two retries.
        retry: (failureCount, error) => {
          const status = errorStatus(error)
          if (status && status >= 400 && status < 500) return false
          return failureCount < 2
        },
      },
      mutations: {
        retry: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

/** One QueryClient per browser tab; a fresh one per server render so requests never share cache. */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
