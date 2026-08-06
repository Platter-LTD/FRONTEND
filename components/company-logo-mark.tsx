"use client"

import { useState } from "react"

export const PLATA_LOGO_FALLBACK = "PLATA"

type CompanyLogoMarkProps = {
  companyLogoUrl?: string | null
  companyName?: string | null
  fallbackText?: string
  className?: string
  imgClassName?: string
  textClassName?: string
}

/**
 * Merchant KYC company logo for Plata dashboard chrome.
 * Falls back to product wordmark when logo is missing or fails to load.
 */
export function CompanyLogoMark({
  companyLogoUrl,
  companyName,
  fallbackText = PLATA_LOGO_FALLBACK,
  className = "",
  imgClassName = "h-10 w-auto max-w-[180px] object-contain object-left",
  textClassName = "text-2xl font-bold text-[#9A813F]",
}: CompanyLogoMarkProps) {
  const [failed, setFailed] = useState(false)
  const src = !failed && companyLogoUrl?.trim() ? companyLogoUrl.trim() : null

  if (src) {
    return (
      <div className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element -- KYC CDN URL is merchant-specific */}
        <img
          src={src}
          alt={companyName?.trim() || "Company logo"}
          className={imgClassName}
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      <span className={textClassName}>{companyName?.trim() || fallbackText}</span>
    </div>
  )
}
