type CustomerNameSource = {
  customerName?: string | null
  userName?: string | null
  fullName?: string | null
  userId?: string | null
  contractSnapshot?: Record<string, unknown> | null
}

function pickName(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

/** Prefer API `customerName`, then snapshot applicant name — never show `User {id}`. */
export function resolveApplicationCustomerName(source: CustomerNameSource): string {
  const snapshot = source.contractSnapshot ?? undefined
  const fromSnapshot = pickName(
    snapshot?.applicantName,
    snapshot?.customerName,
    (snapshot?.finalSubmission as Record<string, unknown> | undefined)?.applicantName,
  )

  return (
    pickName(source.customerName, fromSnapshot, source.userName, source.fullName) ||
    (source.userId ? `Customer ${source.userId.slice(0, 8)}` : "Unknown customer")
  )
}

export function applicationCustomerInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return "CU"
}
