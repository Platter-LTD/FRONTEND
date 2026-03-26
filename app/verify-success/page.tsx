"use client"

import { useEffect } from "react"
import Image from "next/image"
import { EmailVerificationSuccess } from "@/components/email-verification-success"
import { useRouter } from "next/navigation"
import { clearSecureTokens } from "@/lib/tokenManager"
import { ProductAuthShell } from "@/components/product-auth-shell"

export default function VerifySuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const fromVerification = typeof window !== "undefined" && sessionStorage.getItem("verifiedJustNow") === "1"
    if (fromVerification) {
      sessionStorage.removeItem("verifiedJustNow")
      clearSecureTokens()
    }

    const timer = setTimeout(() => {
      router.push("/signin")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  const handleContinue = () => {
    sessionStorage.removeItem("verifiedJustNow")
    clearSecureTokens()
    router.push("/signin")
  }

  return (
    <ProductAuthShell contentClassName="max-w-md">
      <EmailVerificationSuccess onContinue={handleContinue} />
    </ProductAuthShell>
  )
}
