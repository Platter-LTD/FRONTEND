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
import { FullPageAppSkeleton } from "@/components/ui/app-loading-skeleton"
import { getAccessToken } from "@/lib/cookieAuth"

const isDev = process.env.NODE_ENV !== "production"

function resolveKycStatus(res: unknown): string | undefined {
  const r = res as { data?: { status?: string }; status?: string }
  return r?.data?.status ?? r?.status
}

type MerchantComplianceContextValue = {
  isApproved: boolean
  loading: boolean
  tokenPresent: boolean
  refetch: () => Promise<void>
}

const MerchantComplianceContext = createContext<MerchantComplianceContextValue | null>(null)

export function MerchantComplianceProvider({ children }: { children: ReactNode }) {
  const [isApproved, setIsApproved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tokenPresent, setTokenPresent] = useState(false)

  const pathname = usePathname()

  const fetchStatus = useCallback(async () => {
    if (isDev) {
      console.log("[MerchantCompliance] fetchStatus() start")
    }
    setLoading(true)
    try {
      const res = await ComplianceService.getKycStatusForCurrentUser()
      const status = resolveKycStatus(res)?.toLowerCase()
      if (isDev) {
        console.log("[MerchantCompliance] fetchStatus() response:", res, "resolved status:", status)
      }
      setIsApproved(status === "approved")
    } catch {
      if (isDev) {
        console.log("[MerchantCompliance] fetchStatus() failed (falling back to not-approved)")
      }
      setIsApproved(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Wait for cookie access token to be readable before treating a fetch error
  // as "not approved" (which would prematurely redirect users to compliance).
  useEffect(() => {
    let cancelled = false
    let attempts = 0

    const checkTokenAndFetch = async () => {
      const token = typeof document !== "undefined" ? getAccessToken() : null
      const present = !!token
      if (cancelled) return

      setTokenPresent(present)
      if (isDev) {
        console.log("[MerchantCompliance] token check:", {
          pathname,
          tokenPresent: present,
          tokenPrefix: typeof token === "string" ? token.slice(0, 10) : null,
          attempts,
        })
      }
      if (present) {
        await fetchStatus()
        return
      }

      // Retry briefly; the cookie might not be visible immediately after login.
      attempts += 1
      if (attempts < 10) {
        setTimeout(() => {
          void checkTokenAndFetch()
        }, 250)
      } else {
        if (cancelled) return
        setLoading(false)
        setIsApproved(false)
      }
    }

    void checkTokenAndFetch()
    return () => {
      cancelled = true
    }
  }, [fetchStatus, pathname])

  return (
    <MerchantComplianceContext.Provider
      value={{ isApproved, loading, tokenPresent, refetch: fetchStatus }}
    >
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
  const { isApproved, loading, tokenPresent } = useMerchantCompliance()

  useEffect(() => {
    if (loading) return

    if (isDev) {
      console.log("[MerchantCompliance] gate decision:", {
        pathname,
        loading,
        tokenPresent,
        isApproved,
      })
    }

    // If they end up on the compliance page but the backend says approved,
    // send them to Apps.
    if (isApproved && isCompliancePath(pathname)) {
      router.replace("/dashboard/merchant")
      return
    }

    // Only redirect when we have a token and status is NOT approved.
    if (tokenPresent && !isApproved && !isCompliancePath(pathname)) {
      router.replace(COMPLIANCE_PATH)
    }
  }, [loading, isApproved, pathname, router, tokenPresent])

  if (loading) {
    return <FullPageAppSkeleton />
  }

  return <>{children}</>
}
