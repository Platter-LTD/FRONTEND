/**
 * Compliance service origin used by the /api/compliance proxy routes.
 * Uses the same backend base URL defined in `.env` (`NEXT_PUBLIC_API_URL`).
 */
export const COMPLIANCE_API_BASE_FALLBACK = "https://account-ms-plata.fly.dev"

export function getComplianceApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || COMPLIANCE_API_BASE_FALLBACK).trim()
  return raw.replace(/\/+$/, "")
}

