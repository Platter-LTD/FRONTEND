import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

export function getApiBaseUrl(): string {
  return getPlataApiBaseUrl()
}

export function getWalletProxyBaseUrl(): string {
  return getApiBaseUrl()
}
