import type { QueryKey } from "@tanstack/react-query"
import { getQueryClient } from "@/lib/query/queryClient"

/**
 * Thin bridge from the older string-keyed cache API onto the app's React Query client, so service
 * functions that cache (queryCache / invalidateQueries) share one cache with the useQuery hooks.
 * A string key `k` is stored under the React Query key `[k]`.
 */

export function toQueryKey(key: string): QueryKey {
  return [key]
}

function keyMatchesPrefix(queryKey: QueryKey, prefix: string): boolean {
  const head = queryKey[0]
  return typeof head === "string" && (head === prefix || head.startsWith(prefix))
}

/** Cached fetch: returns fresh cached data (younger than ttlMs), joins an in-flight request, or fetches. */
export function queryCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  options?: { force?: boolean },
): Promise<T> {
  return getQueryClient().fetchQuery({
    queryKey: toQueryKey(key),
    queryFn: fetcher,
    staleTime: options?.force ? 0 : ttlMs,
  })
}

/** Mark every query whose key starts with `prefix` stale and refetch the ones on screen. */
export function invalidateQueries(prefix: string): void {
  void getQueryClient().invalidateQueries({
    predicate: (query) => keyMatchesPrefix(query.queryKey, prefix),
  })
}
