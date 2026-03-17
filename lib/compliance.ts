/** localStorage key. Set to "true" when user completes compliance (to be integrated with API later). */
export const COMPLIANCE_COMPLETE_KEY = "compliance_complete"

export function setComplianceComplete(): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(COMPLIANCE_COMPLETE_KEY, "true")
  }
}

export function isComplianceComplete(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(COMPLIANCE_COMPLETE_KEY) === "true"
}
