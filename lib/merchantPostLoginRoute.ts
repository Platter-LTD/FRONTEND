import { isMerchantComplianceBypassEnabled } from "@/lib/merchantComplianceBypass"
import { getUserFromToken } from "@/lib/tokenManager"
import { store } from "@/store/store"
import { fetchKycStatusThunk } from "@/store/complianceSlice"

function isMerchantRoleFromToken(): boolean {
  const u = getUserFromToken()
  const r = (u?.role ?? "").toString().toLowerCase()
  return r.includes("merchant")
}

/** After sign-in: merchants go to Apps when KYC is approved; otherwise Compliance. */
export async function resolveMerchantPostLoginRoute(): Promise<string> {
  if (isMerchantComplianceBypassEnabled()) {
    return "/dashboard/merchant"
  }
  if (!isMerchantRoleFromToken()) {
    return "/dashboard/merchant"
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
