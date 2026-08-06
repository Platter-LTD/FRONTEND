"use client"

import { createContext, useContext, type ReactNode } from "react"

type MobileV2TenantContextValue = {
  appId: string | null
  merchantId: string | null
  tenantSubdomain: string | null
  displayName: string | null
  ready: boolean
  error: string | null
  clearTenant: () => void
}

const MobileV2TenantContext = createContext<MobileV2TenantContextValue | undefined>(undefined)

const defaultValue: MobileV2TenantContextValue = {
  appId: null,
  merchantId: null,
  tenantSubdomain: null,
  displayName: null,
  ready: true,
  error: null,
  clearTenant: () => {},
}

export function MobileV2TenantProvider({ children }: { children: ReactNode }) {
  return (
    <MobileV2TenantContext.Provider value={defaultValue}>{children}</MobileV2TenantContext.Provider>
  )
}

export function useMobileV2Tenant(): MobileV2TenantContextValue {
  const ctx = useContext(MobileV2TenantContext)
  return ctx ?? defaultValue
}
