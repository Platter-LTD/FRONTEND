/**
 * Normalize KYC status from getKycStatusForCurrentUser() / GET /api/v1/kyc/status/:userId.
 * Canonical shape:
 * { success: true, data: { userId, userType, status: "approved" | ..., ... } }
 * Use this everywhere we gate UI (merchant dashboard, sidebars, sign-in redirect).
 */

function pickStatus(obj: unknown): string | undefined {
  if (obj == null) return undefined
  if (typeof obj === "string") return obj
  if (typeof obj !== "object") return undefined
  const r = obj as Record<string, unknown>

  const candidates = [r.status, r.kycStatus, r.approvalStatus, r.verificationStatus]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c
  }

  const inner = r.data
  if (inner != null && typeof inner === "object") {
    const d = inner as Record<string, unknown>
    const innerCandidates = [d.status, d.kycStatus, d.approvalStatus, d.verificationStatus]
    for (const c of innerCandidates) {
      if (typeof c === "string" && c.trim()) return c
    }
    const deep = d.data
    if (deep != null && typeof deep === "object") {
      const d2 = deep as Record<string, unknown>
      const deepCandidates = [d2.status, d2.kycStatus, d2.approvalStatus]
      for (const c of deepCandidates) {
        if (typeof c === "string" && c.trim()) return c
      }
    }
  }

  return undefined
}

/** Raw status string from API response body (any common nesting). */
export function extractKycStatusString(res: unknown): string | undefined {
  return pickStatus(res)
}

/** True when compliance status is approved (case-insensitive). */
export function isKycStatusApproved(res: unknown): boolean {
  const s = extractKycStatusString(res)?.trim().toLowerCase()
  return s === "approved"
}
