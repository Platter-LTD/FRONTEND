import { isMerchantComplianceBypassEnabled } from "@/lib/merchantComplianceBypass"
import { fetchKycStatus } from "@/hooks/queries/compliance"

/**
 * Default landing route after sign-in for the PLATA dashboard (create-app / compliance).
 * Spring TD merchant UI is not part of this app.
 */
export async function resolveDashboardPostLoginRoute(): Promise<string> {
  if (isMerchantComplianceBypassEnabled()) {
    return "/dashboard/create-app/all-apps"
  }
  try {
    const result = await fetchKycStatus()
    if (result.isApproved) {
      return "/dashboard/create-app/all-apps"
    }
  } catch {
    /* treat as not approved */
  }
  return "/dashboard/compliance"
}
