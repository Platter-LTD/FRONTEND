function stripTrailingApiPath(origin: string): string {
  let u = origin.replace(/\/+$/, "")
  u = u.replace(/\/api\/v\d+$/i, "")
  u = u.replace(/\/api$/i, "")
  return u.replace(/\/+$/, "")
}

function readEnvApiUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").trim()
  if (!fromEnv) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is required. Set it in .env / .env.local (see README §12).",
    )
  }
  return stripTrailingApiPath(fromEnv.replace(/\/+$/, ""))
}

/**
 * Plata gateway origin from `.env` (`NEXT_PUBLIC_API_URL`).
 * Product-ms, create-app-ms, and auth routes are reached through this host.
 */
export function getPlataApiBaseUrl(): string {
  return readEnvApiUrl()
}

/** Product-ms API origin — proxied via the Plata gateway (`NEXT_PUBLIC_API_URL`). */
export function getProductApiBaseUrl(): string {
  return getPlataApiBaseUrl()
}
