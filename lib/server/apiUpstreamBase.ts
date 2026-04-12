import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

/** @deprecated Use `getPlataApiBaseUrl` from `@/lib/plataApiBaseUrl` — kept for existing imports. */
export function getApiUpstreamBase(): string {
  return getPlataApiBaseUrl()
}
