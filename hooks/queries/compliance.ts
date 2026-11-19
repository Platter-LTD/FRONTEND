"use client"

import { useQuery } from "@tanstack/react-query"
import { ComplianceService } from "@/lib/services/complianceService"
import { extractKycStatusString, isKycStatusApproved } from "@/lib/kycApproval"
import { isMerchantComplianceBypassEnabled } from "@/lib/merchantComplianceBypass"
import { getQueryClient } from "@/lib/query/queryClient"
import { savedDocsByTile } from "@/lib/businessDocuments"

const BYPASS = isMerchantComplianceBypassEnabled()
const STORAGE_KEY = "spring_compliance_kyc_v1"
const LOG_KYC_STATUS =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_MERCHANT_KYC === "true"

export type KycStatus = { kycStatusRaw: unknown; isApproved: boolean; statusString?: string }

export const complianceKeys = {
  kycStatus: ["compliance", "kyc-status"] as const,
  businessInfo: ["compliance", "business-info"] as const,
  businessDocuments: ["compliance", "business-documents"] as const,
}

/** Last known status (survives reloads) so the sidebar doesn't flash "locked" while refetching. */
function readPersisted(): KycStatus | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as KycStatus) : undefined
  } catch {
    return undefined
  }
}

function writePersisted(data: KycStatus | null) {
  if (typeof window === "undefined") return
  try {
    if (data == null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota / private mode */
  }
}

/** Forget the persisted KYC status (on logout). */
export function clearPersistedKycStatus() {
  writePersisted(null)
}

async function loadKycStatus(): Promise<KycStatus> {
  if (BYPASS) return { kycStatusRaw: null, isApproved: true, statusString: "approved" }
  try {
    const kycStatusRaw = await ComplianceService.getKycStatusForCurrentUser()
    const status: KycStatus = {
      kycStatusRaw,
      isApproved: isKycStatusApproved(kycStatusRaw),
      statusString: extractKycStatusString(kycStatusRaw),
    }
    if (LOG_KYC_STATUS) {
      console.info("[MerchantCompliance/KYC] status response (raw):", kycStatusRaw)
      console.info("[MerchantCompliance/KYC] extractKycStatusString →", status.statusString ?? "(none)")
      console.info("[MerchantCompliance/KYC] isApproved (unlocks sidebar) →", status.isApproved)
    }
    writePersisted(status)
    return status
  } catch (err) {
    if (LOG_KYC_STATUS) console.info("[MerchantCompliance/KYC] fetch failed (sidebar stays locked):", err)
    throw err
  }
}

const kycStatusQuery = () => ({
  queryKey: complianceKeys.kycStatus,
  queryFn: loadKycStatus,
  initialData: readPersisted,
  // Persisted data is only a placeholder: treat it as stale so it is refetched straight away.
  initialDataUpdatedAt: 0,
})

/** Merchant KYC status; `isApproved` unlocks the merchant navigation. */
export function useKycStatus() {
  const query = useQuery(kycStatusQuery())
  return {
    ...query,
    isApproved: BYPASS ? true : (query.data?.isApproved ?? false),
    statusString: query.data?.statusString,
  }
}

/** Fresh KYC status outside React components (e.g. choosing the post-login route). */
export function fetchKycStatus(): Promise<KycStatus> {
  return getQueryClient().fetchQuery({ ...kycStatusQuery(), staleTime: 0 })
}

/** Already-saved business KYC documents (GET /api/v1/kyc/business/documents), keyed by UI tile id. */
export function useBusinessDocuments(enabled = true) {
  return useQuery({
    queryKey: complianceKeys.businessDocuments,
    queryFn: async () => {
      const raw = await ComplianceService.getBusinessDocuments()
      const byTile = savedDocsByTile(raw)
      // Temporary diagnostics: the response shape is unconfirmed, so always log what came back and what parsed.
      console.info("[MerchantCompliance/KYC] GET business/documents raw:", raw)
      console.info("[MerchantCompliance/KYC] parsed tiles:", Object.keys(byTile))
      return { raw, byTile }
    },
    enabled,
  })
}

/** Business info (company name, logo, …) from the KYC profile. */
export function useBusinessInfo(enabled = true) {
  return useQuery({
    queryKey: complianceKeys.businessInfo,
    queryFn: () => ComplianceService.getBusinessInfo(),
    enabled,
  })
}
