/**
 * Single backend origin for Plata (account-ms + product APIs behind the same host).
 *
 * Resolution order (first non-empty wins):
 * - `NEXT_PUBLIC_API_URL` — usual for Next.js (client + server)
 * - `PLATA_API_URL` — server-only override (not exposed to the browser)
 * - `API_URL` — generic server override
 * - built-in fallback
 *
 * Trailing slashes are removed. If the value ends with `/api/v1`, `/api/v2`, or `/api`, that suffix is
 * stripped so callers can safely append `/api/v1/...` (avoids double `/api/v1/api/v1/...`).
 */
export const PLATA_API_BASE_FALLBACK = "https://account-ms-plata.fly.dev"

function stripTrailingApiPath(origin: string): string {
  let u = origin.replace(/\/+$/, "")
  u = u.replace(/\/api\/v\d+$/i, "")
  u = u.replace(/\/api$/i, "")
  return u.replace(/\/+$/, "")
}

export function getPlataApiBaseUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.PLATA_API_URL ||
    process.env.API_URL ||
    PLATA_API_BASE_FALLBACK
  )
    .trim()
    .replace(/\/+$/, "")
  return stripTrailingApiPath(raw)
}
