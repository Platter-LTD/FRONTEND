"use client"

import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchKycStatusThunk } from "@/store/complianceSlice"
import { isMerchantComplianceBypassEnabled } from "@/lib/merchantComplianceBypass"

const COMPLIANCE_BYPASS = isMerchantComplianceBypassEnabled()

type MerchantComplianceContextValue = {
  isApproved: boolean
  loading: boolean
  refetch: () => Promise<void>
}

const MerchantComplianceContext = createContext<MerchantComplianceContextValue | null>(null)

export function MerchantComplianceProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
  const { isApproved, loading } = useAppSelector((state) => state.compliance)

  const fetchStatus = useCallback(async () => {
    await dispatch(fetchKycStatusThunk())
  }, [dispatch])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const value: MerchantComplianceContextValue = {
    isApproved: COMPLIANCE_BYPASS ? true : isApproved,
    loading: COMPLIANCE_BYPASS ? false : loading,
    refetch: fetchStatus,
  }

  return (
    <MerchantComplianceContext.Provider value={value}>{children}</MerchantComplianceContext.Provider>
  )
}

export function useMerchantCompliance() {
  const ctx = useContext(MerchantComplianceContext)
  if (!ctx) {
    throw new Error("useMerchantCompliance must be used within MerchantComplianceProvider")
  }
  return ctx
}

const COMPLIANCE_PATH = "/dashboard/merchant/compliance"

function isCompliancePath(pathname: string) {
  return pathname === COMPLIANCE_PATH || pathname.startsWith(`${COMPLIANCE_PATH}/`)
}

const MERCHANT_APPS_PATH = "/dashboard/create-app/all-apps"

/** True when this document load was a full browser refresh (F5 / reload), not a client-side transition. */
function isBrowserReload(): boolean {
  if (typeof performance === "undefined") return false
  const nav = performance.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined
  return nav?.type === "reload"
}

export function MerchantComplianceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isApproved, loading } = useMerchantCompliance()

  useEffect(() => {
    if (COMPLIANCE_BYPASS || loading) return
    if (!isApproved && !isCompliancePath(pathname)) {
      router.replace(COMPLIANCE_PATH)
    }
  }, [loading, isApproved, pathname, router])

  // Approved + refresh while on compliance → land on Apps (merchant home)
  useEffect(() => {
    if (COMPLIANCE_BYPASS || loading || !isApproved) return
    if (!isCompliancePath(pathname)) return
    if (!isBrowserReload()) return
    router.replace(MERCHANT_APPS_PATH)
  }, [loading, isApproved, pathname, router])

  return <>{children}</>
}
