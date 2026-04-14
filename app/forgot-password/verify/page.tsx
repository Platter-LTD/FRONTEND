"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "react-toastify"
import { apiClient } from "@/lib/api"
import { ENDPOINTS } from "@/lib/endpoints"
import { ProductAuthShell } from "@/components/product-auth-shell"
import {
  FORGOT_PASSWORD_EMAIL_KEY,
  PASSWORD_RESET_TOKEN_KEY,
  getPasswordResetOtpPurpose,
  pickPasswordResetToken,
} from "@/lib/forgotPasswordFlow"

function ForgotPasswordVerifyContent() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(FORGOT_PASSWORD_EMAIL_KEY) : null
    if (!stored?.trim()) {
      router.replace("/forgot-password")
      return
    }
    setEmail(stored.trim())
  }, [router])

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    if (value && index === 5 && newOtp.every((d) => d !== "")) {
      void handleVerifyOTP(newOtp.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(""))
      inputRefs.current[5]?.focus()
      void handleVerifyOTP(pasted)
    }
  }

  const purpose = getPasswordResetOtpPurpose()

  const handleResend = async () => {
    if (!email) return
    try {
      setIsResending(true)
      await apiClient.post(
        ENDPOINTS.auth.otp.resendEmail,
        { identifier: email, channel: "email", purpose },
        { includeAuth: false },
      )
      toast.success("A new code has been sent to your email.")
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ??
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "Failed to resend code"
      toast.error(msg)
    } finally {
      setIsResending(false)
    }
  }

  const handleVerifyOTP = async (code?: string) => {
    const codeToUse = code ?? otp.join("")
    if (codeToUse.length !== 6) {
      toast.error("Please enter the complete 6-digit code.")
      return
    }
    if (!email) {
      toast.error("Missing email. Start again from forgot password.")
      router.replace("/forgot-password")
      return
    }
    try {
      setIsVerifying(true)
      const res = await apiClient.post(
        ENDPOINTS.auth.verify.emailOtp,
        {
          email,
          identifier: email,
          otp: codeToUse,
          code: codeToUse,
          purpose,
        },
        { includeAuth: false },
      )
      const token = pickPasswordResetToken(res.data)
      if (!token) {
        toast.error("Code accepted, but no reset token was returned. Please contact support or try again.")
        setOtp(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
        return
      }
      sessionStorage.setItem(PASSWORD_RESET_TOKEN_KEY, token)
      toast.success("Code verified. Set your new password.")
      router.push("/reset-password")
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err as { message?: string })?.message ??
        "Invalid or expired code"
      toast.error(msg)
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <ProductAuthShell contentClassName="max-w-md">
      <div className="w-full">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col items-center">
            <Image src="/images/sms-notification.png" alt="" width={64} height={64} className="mb-4 h-16 w-16" />
            <h1 className="text-2xl font-semibold text-gray-900">Check your email</h1>
            <p className="mt-2 text-center text-sm text-gray-500">
              {email ? `We sent a 6-digit code to ${email}` : "Loading…"}
            </p>
          </div>

          <h3 className="mb-4 text-center text-lg font-medium text-gray-900">Enter verification code</h3>

          <div className="mb-6 flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isVerifying}
                className="h-14 w-12 rounded-lg border-2 border-gray-300 bg-white text-center text-2xl font-semibold text-gray-900 transition-all duration-200 focus:border-[#9A813F] focus:outline-none focus:ring-2 focus:ring-[#9A813F]/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            ))}
          </div>

          <Button
            type="button"
            onClick={() => void handleVerifyOTP()}
            disabled={isVerifying || otp.some((d) => d === "")}
            className="h-12 w-full !bg-[#9A813F] text-white hover:!bg-[#8A7335] disabled:opacity-50"
          >
            {isVerifying ? "Verifying…" : "Verify code"}
          </Button>

          <p className="mt-4 text-center text-sm text-gray-500">
            Did not receive the code?{" "}
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={isResending || !email}
              className="font-medium text-[#9A813F] hover:underline disabled:opacity-50"
            >
              {isResending ? "Sending…" : "Resend code"}
            </button>
          </p>

          <div className="mt-6 text-center">
            <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-gray-900">
              Use a different email
            </Link>
          </div>
        </div>
      </div>
    </ProductAuthShell>
  )
}

export default function ForgotPasswordVerifyPage() {
  return (
    <Suspense
      fallback={
        <ProductAuthShell contentClassName="max-w-md">
          <div className="py-8 text-center text-gray-600">Loading…</div>
        </ProductAuthShell>
      }
    >
      <ForgotPasswordVerifyContent />
    </Suspense>
  )
}
