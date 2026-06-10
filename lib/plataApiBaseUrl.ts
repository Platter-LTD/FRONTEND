function stripTrailingApiPath(origin: string): string {
  let u = origin.replace(/\/+$/, "")
  u = u.replace(/\/api\/v\d+$/i, "")
  u = u.replace(/\/api$/i, "")
  return u.replace(/\/+$/, "")
}

/**
 * `NEXT_PUBLIC_API_URL` with Plata gateway default when unset.
 * If env is exactly Spring’s `https://account-ms.fly.dev`, use Plata’s gateway instead.
 */
export function getPlataApiBaseUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "")

  let raw = fromEnv
  if (!raw) {
    raw = "https://account-ms-plata.fly.dev"
  } else {
    const normalized = stripTrailingApiPath(fromEnv)
    if (/^https?:\/\/(www\.)?account-ms\.fly\.dev$/i.test(normalized)) {
      raw = "https://account-ms-plata.fly.dev"
    }
  }

  return stripTrailingApiPath(raw)
}
