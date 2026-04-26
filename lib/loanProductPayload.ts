/** Helpers for loan product MS document shape (about / structure / requirements / feesAndCharges). */

function asBool(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1"
}

/**
 * Map a security option label from the configure UI to API `requirements.security` keys.
 */
export function selectionToSecurityKey(option: string): string | null {
  const t = option.trim().toLowerCase().replace(/[\s_-]+/g, " ")
  if (!t) return null
  if (t.includes("guarantor")) return "guarantor"
  if (t.includes("savings") && t.includes("account")) return "savingsAccount"
  if (t.includes("no security") || (t.includes("no") && t.includes("security"))) return "noSecurity"
  return null
}

const SECURITY_KEYS = ["guarantor", "savingsAccount", "noSecurity"] as const

export function securityRecordFromSelections(selected: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {
    guarantor: false,
    savingsAccount: false,
    noSecurity: false,
  }
  for (const opt of selected) {
    const k = selectionToSecurityKey(opt)
    if (k && SECURITY_KEYS.includes(k as (typeof SECURITY_KEYS)[number])) out[k] = true
  }
  return out
}

export function selectionsFromSecurityRecord(
  sec: Record<string, unknown> | null | undefined,
  options: string[],
): string[] {
  if (!sec || typeof sec !== "object") return []
  return options.filter((opt) => {
    const k = selectionToSecurityKey(opt)
    return k ? asBool((sec as Record<string, unknown>)[k]) : false
  })
}

/** Strip % and trim for API `structure.interestRate` string (e.g. "12"). */
export function normalizeLoanInterestRateForApi(raw: unknown): string | undefined {
  if (raw == null) return undefined
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = (raw as { value?: string | number }).value
    if (v == null || String(v).trim() === "") return undefined
    return String(v).replace(/%/g, "").trim() || undefined
  }
  const s = String(raw).replace(/%/g, "").trim()
  return s || undefined
}
