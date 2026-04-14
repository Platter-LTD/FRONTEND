"use client"

import React from "react"
import { useAppSelector } from "@/store/hooks"
import { formatMonthlyVolumeDisplay } from "@/lib/countryCurrency"

interface CurrencyVolumeFieldProps {
  value: string
  onChange: (digitsOnly: string) => void
  accentColor?: string
  countryCode?: string | null
}

/**
 * Monthly volume: stores digits-only in parent state; shows currency from signup country when blurred.
 */
export function CurrencyVolumeField({
  value,
  onChange,
  accentColor = "#9A813F",
  countryCode,
}: CurrencyVolumeFieldProps) {
  const signupCountry = useAppSelector((s) => s.auth.user?.country)
  const effectiveCountry = countryCode ?? signupCountry

  const digits = value.replace(/\D/g, "")
  const displayValue = digits ? formatMonthlyVolumeDisplay(digits, effectiveCountry) : ""

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={displayValue}
      onChange={(e) => {
        const next = e.target.value.replace(/\D/g, "")
        onChange(next)
      }}
      placeholder="Monthly processed volume"
      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900"
      style={{ outlineColor: accentColor }}
      aria-label="Monthly processed volume"
    />
  )
}
