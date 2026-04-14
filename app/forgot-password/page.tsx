"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-toastify"
import { apiClient } from "@/lib/api"
import { ENDPOINTS } from "@/lib/endpoints"
import { ArrowLeft } from "lucide-react"
import { ProductAuthShell } from "@/components/product-auth-shell"
import { FORGOT_PASSWORD_EMAIL_KEY } from "@/lib/forgotPasswordFlow"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await apiClient.post(ENDPOINTS.auth.password.forgot, { email: email.trim() }, { includeAuth: false })
      if (typeof window !== "undefined") {
        sessionStorage.setItem(FORGOT_PASSWORD_EMAIL_KEY, email.trim())
      }
      toast.success("We sent a 6-digit code to your email. Enter it with your new password to reset.")
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`)
    } catch (error: unknown) {
      console.error("Forgot password error:", error)
      const err = error as { response?: { data?: { message?: string; error?: string } } }
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to send reset code"
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ProductAuthShell>
      <div className="w-full px-4">
        <div className="space-y-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">Reset your password</h1>
            <p className="text-sm text-gray-500">
              Enter your email address. We will send a 6-digit code to verify it is you before you choose a new
              password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14"
                required
              />
            </div>

            <Button
              type="submit"
              className="h-12 w-full text-white !bg-[#9A813F] hover:!bg-[#8A7335]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending code…" : "Send code"}
            </Button>

            <div className="text-center">
              <Link
                href="/signin"
                className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </ProductAuthShell>
  )
}
