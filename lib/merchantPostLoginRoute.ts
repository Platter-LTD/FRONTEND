import { isMerchantComplianceBypassEnabled } from "@/lib/merchantComplianceBypass"
import { getUserFromToken } from "@/lib/tokenManager"
import { store } from "@/store/store"
import { fetchKycStatusThunk } from "@/store/complianceSlice"

function isMerchantRoleFromToken(): boolean {
  const u = getUserFromToken()
  const r = (u?.role ?? "").toString().toLowerCase()
  return r.includes("merchant")
}

/** After sign-in: merchants go to apps or compliance based on GET /api/v1/kyc/status/:userId → data.status === "approved". */
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
      return "/dashboard/merchant"
    }
  } catch {
    /* treat as not approved */
  }
  return "/dashboard/merchant/compliance"
}
