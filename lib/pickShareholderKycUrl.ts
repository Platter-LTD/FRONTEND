/**
 * Resolve shareholder / beneficial-owner KYC link from API shapes (nested `kyc.url`, flat fields).
 */
export function pickShareholderKycUrl(raw: unknown): string {
  if (raw == null || typeof raw !== "object") return ""
  const s = raw as Record<string, unknown>

  const kyc = s.kyc
  if (kyc && typeof kyc === "object") {
    const k = kyc as Record<string, unknown>
    const u = k.url ?? k.kycUrl ?? k.verificationUrl ?? k.link
    if (typeof u === "string" && u.trim()) return u.trim()
  }

  for (const key of ["kycUrl", "kycURL", "verificationUrl", "kyc_link", "livenessUrl"] as const) {
    const v = s[key]
    if (typeof v === "string" && v.trim()) return v.trim()
  }

  return ""
}
