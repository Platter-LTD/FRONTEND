import { ComplianceService } from "@/lib/services/complianceService"
import { isKycStatusApproved } from "@/lib/kycApproval"
import { isMerchantComplianceBypassEnabled } from "@/lib/merchantComplianceBypass"
import { getUserFromToken } from "@/lib/tokenManager"

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
    const res = await ComplianceService.getKycStatusForCurrentUser()
    if (isKycStatusApproved(res)) {
      return "/dashboard/merchant"
    }
  } catch {
    /* treat as not approved */
  }
  return "/dashboard/merchant/compliance"
}
