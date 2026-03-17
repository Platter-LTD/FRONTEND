"use client"

import { useEffect } from "react"
import Image from "next/image"
import { EmailVerificationSuccess } from "@/components/email-verification-success"
import { useRouter } from "next/navigation"
import { clearSecureTokens } from "@/lib/tokenManager"

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
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 relative">
      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <span className="text-2xl font-bold text-[#9A813F]">Product Builder</span>
      </div>
      <EmailVerificationSuccess onContinue={handleContinue} />
    </main>
  )
}
