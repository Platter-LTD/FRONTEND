import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

/**
 * Compliance service origin used by the /api/compliance proxy routes.
 * Uses `COMPLIANCE_API_URL` / `NEXT_PUBLIC_COMPLIANCE_API_URL` when set,
 * otherwise the same gateway as product-ms (`NEXT_PUBLIC_API_URL`).
 */
export function getComplianceApiBaseUrl(): string {
  const explicit = (
    process.env.COMPLIANCE_API_URL ||
    process.env.NEXT_PUBLIC_COMPLIANCE_API_URL ||
    ""
  ).trim()
  if (explicit) return explicit.replace(/\/+$/, "")
  return getPlataApiBaseUrl()
}
