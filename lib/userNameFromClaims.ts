/**
 * Resolve display names from JWT / API user payloads (camelCase, snake_case, OIDC).
 * Avoids using the email local-part (or duplicate of `email`) as a "name" when the IdP
 * puts it in `name` / `preferred_username`.
 */

function emailLocalPart(email: string): string {
  const e = email.trim().toLowerCase()
  if (!e.includes("@")) return ""
  return e.split("@")[0] ?? ""
}

function isSameAsEmailLocalPart(value: string, email: string): boolean {
  const v = value.trim().toLowerCase()
  const local = emailLocalPart(email)
  if (!v || !local) return false
  return v === local
}

/** True when `name` is only the email local-part (no spaces), not a real person name. */
export function looksLikeEmailLocalOnly(name: string, email: string): boolean {
  const n = name.trim()
  if (!n || !email.includes("@")) return false
  if (n.includes("@")) return n.toLowerCase() === email.trim().toLowerCase()
  return isSameAsEmailLocalPart(n, email) && !/\s/.test(n)
}

/**
 * Best-effort display name fallback from email local-part.
 * Example: "arikpostanley123+1@gmail.com" -> "Arik Postanley".
 */
export function displayNameFromEmail(email: string): string {
  if (!email.includes("@")) return ""
  const local = email.split("@")[0]?.trim() ?? ""
  if (!local) return ""

  const base = local
    .replace(/\+.*/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!base) return ""

  const spaced = base
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()

  const words = spaced
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

  if (words.length >= 2) return `${words[0]} ${words[1]}`
  return words[0] ?? ""
}

export function namesFromJwtPayload(payload: Record<string, unknown>): {
  firstName: string
  lastName: string
} {
  const emailRaw = String(payload.email ?? "").trim()
  const emailLower = emailRaw.toLowerCase()

  let first = String(payload.firstName ?? payload.first_name ?? payload.given_name ?? "").trim()
  let last = String(payload.lastName ?? payload.last_name ?? payload.family_name ?? "").trim()

  const trySplitDisplay = (raw: string) => {
    const t = raw.trim()
    if (!t || t.includes("@")) return
    if (emailLower && isSameAsEmailLocalPart(t, emailRaw) && !/\s/.test(t)) return
    const parts = t.split(/\s+/).filter(Boolean)
    if (!parts.length) return
    first = parts[0] ?? ""
    last = parts.slice(1).join(" ")
  }

  if (!first && !last) {
    const display = String(
      payload.displayName ?? payload.display_name ?? payload.nickname ?? payload.preferred_username ?? "",
    ).trim()
    if (display && display !== emailLower) {
      trySplitDisplay(display)
    }
  }

  if (!first && !last && typeof payload.name === "string") {
    trySplitDisplay(payload.name)
  }

  if (!first && !last) {
    const pref = String(payload.preferred_username ?? "").trim()
    if (pref && pref !== emailLower && !pref.includes("@")) {
      trySplitDisplay(pref)
    }
  }

  if (first && !last && emailRaw && isSameAsEmailLocalPart(first, emailRaw)) {
    first = ""
  }

  return { firstName: first, lastName: last }
}
