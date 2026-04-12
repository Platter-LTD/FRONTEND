/** Beneficial-owner / shareholder payloads vary by service (camelCase, snake_case, nested). */
export function pickShareholderPhone(raw: unknown): string {
  if (raw == null || typeof raw !== "object") return ""
  const s = raw as Record<string, unknown>
  const candidates = [
    s.phoneNumber,
    s.phone,
    s.phone_number,
    s.mobilePhone,
    s.mobile,
    s.contactPhone,
    s.telephone,
  ]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim()
  }
  for (const nestedKey of ["kyc", "contact", "personalInfo"] as const) {
    const nested = s[nestedKey]
    if (nested == null || typeof nested !== "object") continue
    const n = nested as Record<string, unknown>
    for (const c of [n.phoneNumber, n.phone, n.phone_number, n.mobilePhone, n.mobile]) {
      if (typeof c === "string" && c.trim()) return c.trim()
    }
  }
  return ""
}
