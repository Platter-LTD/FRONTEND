"use client"

import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { WEBSITE_URL_PREFIX } from "@/lib/websiteUrl"
import { ComplianceService } from "@/lib/services/complianceService"

export interface ShareholderRow {
  name: string
  email: string
  phone: string
  date: string
  /** KYC / liveness URL returned by compliance API — copy & email to shareholder. */
  kycUrl?: string
  status: "Successful" | "Failed" | "Pending"
}

/** In-memory merchant KYC survey (merchant dashboard forms — no localStorage). */
export interface MerchantBusinessSurveyState {
  businessType: string
  userBase: string
  businessModel: string
  monthlyVolume: string
  industry: string
  country: string
  businessName: string
  website: string
  companyRegId: string
}

export function createDefaultMerchantBusinessSurvey(): MerchantBusinessSurveyState {
  return {
    businessType: "",
    userBase: "",
    businessModel: "",
    monthlyVolume: "",
    industry: "",
    country: "",
    businessName: "",
    website: WEBSITE_URL_PREFIX,
    companyRegId: "",
  }
}

interface ComplianceFormContextType {
  businessFiles: Record<string, File>
  setBusinessFile: (key: string, file: File | null) => void
  shareholders: ShareholderRow[]
  setShareholders: (shareholders: ShareholderRow[]) => void
  addShareholder: (shareholder: ShareholderRow) => void
  shareholderDrawerOpen: boolean
  setShareholderDrawerOpen: (open: boolean) => void
  merchantBusinessSurvey: MerchantBusinessSurveyState
  setMerchantBusinessSurvey: Dispatch<SetStateAction<MerchantBusinessSurveyState>>
  compliancePrefill: Record<string, unknown> | null
}

const ComplianceFormContext = createContext<ComplianceFormContextType | undefined>(undefined)

export function ComplianceFormProvider({ children }: { children: ReactNode }) {
  const [businessFiles, setBusinessFiles] = useState<Record<string, File>>({})
  const [shareholders, setShareholders] = useState<ShareholderRow[]>([])
  const [shareholderDrawerOpen, setShareholderDrawerOpen] = useState(false)
  const [merchantBusinessSurvey, setMerchantBusinessSurvey] = useState<MerchantBusinessSurveyState>(() =>
    createDefaultMerchantBusinessSurvey(),
  )
  const [compliancePrefill, setCompliancePrefill] = useState<Record<string, unknown> | null>(null)

  const setBusinessFile = (key: string, file: File | null) => {
    setBusinessFiles((prev) => {
      if (file === null) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: file }
    })
  }

  const addShareholder = (shareholder: ShareholderRow) => {
    setShareholders((prev) => [...prev, shareholder])
  }

  useEffect(() => {
    void (async () => {
      try {
        const prefill = await ComplianceService.getCompliancePrefillForCurrentMerchant()
        if (!prefill) return
        const businessInfo = (prefill.businessInfo ?? {}) as Record<string, unknown>
        const businessSurvey = (prefill.businessSurvey ?? {}) as Record<string, unknown>
        const owners = Array.isArray(prefill.beneficialOwners) ? prefill.beneficialOwners : []

        setCompliancePrefill(prefill as unknown as Record<string, unknown>)
        setMerchantBusinessSurvey((prev) => ({
          ...prev,
          businessType: String(businessSurvey.businessType ?? prev.businessType ?? ""),
          userBase: String(businessSurvey.country ?? prev.userBase ?? ""),
          businessModel: String(businessSurvey.businessModel ?? prev.businessModel ?? ""),
          monthlyVolume:
            businessSurvey.monthlyProcessedVolume != null
              ? String(businessSurvey.monthlyProcessedVolume)
              : prev.monthlyVolume,
          industry: String(businessInfo.industry ?? prev.industry ?? ""),
          country: String(businessInfo.countryOfIncorporation ?? prev.country ?? ""),
          businessName: String(businessInfo.companyName ?? prev.businessName ?? ""),
          website: String(businessInfo.website ?? prev.website ?? WEBSITE_URL_PREFIX),
          companyRegId: String(businessInfo.companyRegId ?? prev.companyRegId ?? ""),
        }))

        const mapped = owners.map((s: any) => ({
          name: s.fullName || s.name || "Unknown",
          email: s.email || "",
          phone: s.phoneNumber || s.phone || "",
          date: String(s.submittedAt || s.createdAt || new Date().toISOString()).slice(0, 16).replace("T", " "),
          kycUrl: s?.kyc?.url || s?.kycUrl || "",
          status:
            s.status === "APPROVED" || s.status === "Successful"
              ? ("Successful" as const)
              : s.status === "REJECTED"
                ? ("Failed" as const)
                : ("Pending" as const),
        }))
        if (mapped.length > 0) setShareholders(mapped)
      } catch {
        // Keep blank defaults when prefill endpoints are unavailable.
      }
    })()
  }, [])

  return (
    <ComplianceFormContext.Provider
      value={{
        businessFiles,
        setBusinessFile,
        shareholders,
        setShareholders,
        addShareholder,
        shareholderDrawerOpen,
        setShareholderDrawerOpen,
        merchantBusinessSurvey,
        setMerchantBusinessSurvey,
        compliancePrefill,
      }}
    >
      {children}
    </ComplianceFormContext.Provider>
  )
}

export function useComplianceForm() {
  const context = useContext(ComplianceFormContext)
  if (context === undefined) {
    throw new Error("useComplianceForm must be used within a ComplianceFormProvider")
  }
  return context
}
