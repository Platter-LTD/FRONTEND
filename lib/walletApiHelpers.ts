/** Plata wallet-ms helpers (BILLING / TREASURY / REPAYMENT; SETTLEMENT/KYC legacy). */

export type PlataMerchantWalletType =
  | "BILLING"
  | "TREASURY"
  | "REPAYMENT"
  | "SETTLEMENT"
  | "OPERATION"
  | "KYC"

export type PlataLegacyBundleKey = "treasury" | "operation" | "kyc"

export function walletMessageFromBody(data: unknown): string {
  if (!data || typeof data !== "object") return ""
  const d = data as Record<string, unknown>
  const m = d.message ?? d.error ?? d.details ?? d.detail
  if (m == null || m === "") return ""
  if (typeof m === "object") {
    return Object.values(m as Record<string, unknown>)
      .filter((v) => typeof v === "string" && v)
      .join(". ")
  }
  return String(m)
}

/** Prefer new wallet-type names; legacy OPERATION→BILLING, KYC|SETTLEMENT→REPAYMENT. */
export function normalizePlataMerchantWalletType(
  type?: string,
): "BILLING" | "TREASURY" | "REPAYMENT" {
  const t = String(type || "").toUpperCase()
  if (t === "OPERATION") return "BILLING"
  if (t === "KYC" || t === "SETTLEMENT" || t === "REPAYMENT") return "REPAYMENT"
  if (t === "BILLING" || t === "TREASURY") return t
  return "BILLING"
}

/** Map API wallet type → Redux bundle key used by create-app wallet pages. */
export function legacyBundleKeyFromType(type?: string): PlataLegacyBundleKey | null {
  const t = normalizePlataMerchantWalletType(type)
  if (t === "TREASURY") return "treasury"
  if (t === "BILLING") return "operation"
  if (t === "REPAYMENT") return "kyc"
  return null
}

export function walletAppHeaders(appId?: string): Record<string, string> {
  if (!appId) return {}
  return { "x-app-id": appId }
}

export function buildWalletQuery(
  params?: Record<string, string | number | undefined>,
  appId?: string,
): string {
  const qs = new URLSearchParams()
  if (appId) qs.set("appId", appId)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") qs.set(key, String(value))
    }
  }
  const s = qs.toString()
  return s ? `?${s}` : ""
}
