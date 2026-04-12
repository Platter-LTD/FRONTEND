import { isMerchantComplianceBypassEnabled } from "@/lib/merchantComplianceBypass"
import { store } from "@/store/store"
import { fetchKycStatusThunk } from "@/store/complianceSlice"

/**
 * Default landing route after sign-in for the PLATA dashboard (create-app / compliance).
 * Spring TD merchant UI is not part of this app.
 */
export async function resolveDashboardPostLoginRoute(): Promise<string> {
  if (isMerchantComplianceBypassEnabled()) {
    return "/dashboard/create-app/all-apps"
  }
  try {
    const result = await store.dispatch(fetchKycStatusThunk()).unwrap()
    if (result.isApproved) {
      return "/dashboard/create-app/all-apps"
    }
  } catch {
    /* treat as not approved */
  }
  return "/dashboard/compliance"
}
