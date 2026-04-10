type JwtPayload = Record<string, unknown>

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return null
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const pad = normalized + "=".repeat((4 - (normalized.length % 4)) % 4)
    const json = Buffer.from(pad, "base64").toString("utf8")
    const payload = JSON.parse(json) as JwtPayload
    return payload
  } catch {
    return null
  }
}

function pickRole(payload: JwtPayload | null): string {
  if (!payload) return "MERCHANT"
  const candidates: string[] = []
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) candidates.push(v.trim())
  }
  const pushArr = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(push)
  }

  push(payload.role)
  push(payload.userRole)
  push(payload.user_role)
  push(payload.userType)
  push(payload.user_type)
  pushArr(payload.roles)
  pushArr(payload.authorities)
  if (typeof payload.scope === "string") payload.scope.split(/[\s,]+/).forEach(push)
  const realm = payload.realm_access as { roles?: unknown[] } | undefined
  if (realm && Array.isArray(realm.roles)) pushArr(realm.roles)

  const normalized = candidates
    .map((r) => r.toUpperCase())
    .map((r) => (r.startsWith("ROLE_") ? r.slice("ROLE_".length) : r))

  if (normalized.includes("ADMIN")) return "ADMIN"
  if (normalized.includes("MERCHANT")) return "MERCHANT"
  const hasMerchantId = Boolean(
    payload.userMerchantId || payload.user_merchant_id || payload.merchantId || payload.merchant_id,
  )
  if (hasMerchantId) return "MERCHANT"
  return normalized[0] || "MERCHANT"
}

function pickMerchantId(payload: JwtPayload | null): string | null {
  if (!payload) return null
  const candidates: unknown[] = [
    payload.userMerchantId,
    payload.user_merchant_id,
    payload.merchantId,
    payload.merchant_id,
    payload.merchantID,
    payload.user_merchantId,
    payload.merchant,
    payload.merchant_id,
    (payload.user as Record<string, unknown> | undefined)?.merchantId,
    (payload.user as Record<string, unknown> | undefined)?.merchant_id,
    (payload.data as Record<string, unknown> | undefined)?.merchantId,
    (payload.data as Record<string, unknown> | undefined)?.merchant_id,
    // Last-resort fallbacks if token uses user ID as merchant owner id
    payload.userId,
    payload.id,
    payload.sub,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim()
  }
  return null
}

export function merchantRoleHeadersFromAuthorization(authorization: string | null): Record<string, string> {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : ""
  const payload = token ? decodeJwtPayload(token) : null
  const role = pickRole(payload)
  const merchantId = pickMerchantId(payload)
  return {
    "x-user-role": role,
    "x-user-type": role,
    "x-user-roles": role,
    ...(merchantId
      ? {
          "x-merchant-id": merchantId,
          "x-user-merchant-id": merchantId,
        }
      : {}),
  }
}
