"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { ComplianceService } from "@/lib/services/complianceService"
import { isKycStatusApproved } from "@/lib/kycApproval"
import { isMerchantComplianceBypassEnabled } from "@/lib/merchantComplianceBypass"

const COMPLIANCE_BYPASS = isMerchantComplianceBypassEnabled()

type MerchantComplianceContextValue = {
  isApproved: boolean
  loading: boolean
  refetch: () => Promise<void>
}

const MerchantComplianceContext = createContext<MerchantComplianceContextValue | null>(null)

export function MerchantComplianceProvider({ children }: { children: ReactNode }) {
  const [isApproved, setIsApproved] = useState(() => COMPLIANCE_BYPASS)
  const [loading, setLoading] = useState(() => !COMPLIANCE_BYPASS)

  const fetchStatus = useCallback(async () => {
    if (COMPLIANCE_BYPASS) {
      setIsApproved(true)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await ComplianceService.getKycStatusForCurrentUser()
      setIsApproved(isKycStatusApproved(res))
    } catch {
      setIsApproved(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  return (
    <MerchantComplianceContext.Provider value={{ isApproved, loading, refetch: fetchStatus }}>
      {children}
    </MerchantComplianceContext.Provider>
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

  return <>{children}</>
}
