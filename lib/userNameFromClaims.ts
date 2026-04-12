/**
 * Resolve display names from JWT / API user payloads (camelCase, snake_case, OIDC).
 */
export function namesFromJwtPayload(payload: Record<string, unknown>): {
  firstName: string
  lastName: string
} {
  let first = String(payload.firstName ?? payload.first_name ?? payload.given_name ?? "").trim()
  let last = String(payload.lastName ?? payload.last_name ?? payload.family_name ?? "").trim()

  if (!first && !last && typeof payload.name === "string") {
    const parts = payload.name.trim().split(/\s+/).filter(Boolean)
    first = parts[0] ?? ""
    last = parts.slice(1).join(" ")
  }

  return { firstName: first, lastName: last }
}
