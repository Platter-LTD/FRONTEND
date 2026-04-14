"use client"

import { useState, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-toastify"
import { apiClient } from "@/lib/api"
import { ENDPOINTS } from "@/lib/endpoints"
import { Eye, EyeOff } from "lucide-react"
import { ProductAuthShell } from "@/components/product-auth-shell"
import { FORGOT_PASSWORD_EMAIL_KEY } from "@/lib/forgotPasswordFlow"

function ResetPasswordForm() {
  const [formData, setFormData] = useState({
    code: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const emailFromQuery = searchParams.get("email")
    if (emailFromQuery?.trim()) {
      setEmail(emailFromQuery.trim())
      return
    }
    if (typeof window !== "undefined") {
      const fromSession = sessionStorage.getItem(FORGOT_PASSWORD_EMAIL_KEY)
      if (fromSession?.trim()) {
        setEmail(fromSession.trim())
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error("Missing email. Start again from forgot password.")
      router.push("/forgot-password")
      return
    }

    if (formData.code.length !== 6) {
      toast.error("Please enter the 6-digit code.")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    setIsSubmitting(true)

    try {
      await apiClient.post(
        ENDPOINTS.auth.password.reset,
        {
          email,
          code: formData.code,
          newPassword: formData.password,
        },
        { includeAuth: false },
      )

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(FORGOT_PASSWORD_EMAIL_KEY)
      }

      setIsSuccess(true)
      toast.success("Password reset successfully")

      setTimeout(() => {
        router.push("/signin")
      }, 3000)
    } catch (error: unknown) {
      console.error("Reset password error:", error)
      const err = error as { response?: { data?: { message?: string; error?: string } } }
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to reset password"
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Password reset</h1>
          <p className="text-gray-500">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
        </div>

        <Link href="/signin">
          <Button className="h-12 w-full text-white hover:opacity-90" style={{ backgroundColor: "#74612F" }}>
            Sign in
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <p className="text-sm text-gray-500">Your new password must be different from previously used passwords.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={formData.code}
            onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, "") }))}
            className="h-14"
            required
          />
        </div>

        <div className="relative space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create new password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className="h-14 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="relative space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="h-14 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-white hover:opacity-90"
          style={{ backgroundColor: "#74612F" }}
          disabled={isSubmitting || !email}
        >
          {isSubmitting ? "Resetting password..." : "Reset password"}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <ProductAuthShell>
      <div className="w-full px-4">
        <Suspense
          fallback={
            <div className="flex justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#9A813F]" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </ProductAuthShell>
  )
}
