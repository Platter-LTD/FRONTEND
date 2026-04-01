"use client"

import { useEffect } from "react"
import Image from "next/image"
import { EmailVerificationSuccess } from "@/components/email-verification-success"
import { clearSecureTokens } from "@/lib/tokenManager"
import { ProductAuthShell } from "@/components/product-auth-shell"

export default function VerifySuccessPage() {
  useEffect(() => {
    const fromVerification = typeof window !== "undefined" && sessionStorage.getItem("verifiedJustNow") === "1"
    if (fromVerification) {
      sessionStorage.removeItem("verifiedJustNow")
      clearSecureTokens()
    }
  }, [])

  const handleContinue = () => {
    sessionStorage.removeItem("verifiedJustNow")
    clearSecureTokens()
  }

  return (
    <ProductAuthShell contentClassName="max-w-md">
      <EmailVerificationSuccess onContinue={handleContinue} />
    </ProductAuthShell>
  )
}
