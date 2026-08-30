"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { RegistrationForm } from "@/components/registration-form"
import { toast } from "react-toastify"
import { apiClient } from "@/lib/api"
import { ENDPOINTS } from "@/lib/endpoints"
import { ProductAuthShell } from "@/components/product-auth-shell"
import { registrationPasswordError } from "@/lib/passwordRules"
import { teamApi } from "@/lib/services/teamService"

function SignupPageContent() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const invitationToken = (searchParams.get("token") || "").trim()
  const invitationEmail = (searchParams.get("email") || "").trim()
  const invitationMode =
    searchParams.get("invitation") === "1" && Boolean(invitationToken && invitationEmail)
  const roleName = (searchParams.get("role") || "").trim() || undefined

  const handleSubmit = async (formData: {
    firstName: string
    lastName: string
    country: string
    email: string
    phoneNumber: string
    password: string
    confirmPassword: string
    agreeToTerms: boolean
  }) => {
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    const passwordError = registrationPasswordError(formData.password)
    if (passwordError) {
      toast.error(passwordError)
      return
    }
    if (!formData.agreeToTerms) {
      toast.error("You must accept the terms and conditions")
      return
    }

    setIsSubmitting(true)

    try {
      if (invitationMode) {
        const res = await teamApi.acceptInvitation({
          token: invitationToken,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          password: formData.password,
        })
        if (!res.success) {
          toast.error(res.error || "Failed to accept invitation.")
          return
        }
        toast.success("Account created! Sign in to continue.")
        router.push("/signin")
        return
      }

      const raw = formData.phoneNumber.replace(/\s/g, "").replace(/^\+/, "")
      let phone: string
      if (formData.country === "ng") {
        const digits = raw.replace(/^0/, "")
        phone = digits.length <= 10 ? `+234${digits}` : raw.startsWith("234") ? `+${raw}` : `+234${digits}`
      } else {
        phone = formData.phoneNumber.startsWith("+") ? formData.phoneNumber : `+${formData.phoneNumber}`
      }

      const registrationData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        country: formData.country,
        email: formData.email,
        phone,
        password: formData.password,
        user_merchant_id: `merchant_${Date.now()}`,
      }

      const response = await apiClient.post(ENDPOINTS.auth.signup.merchant, registrationData, {
        includeAuth: false,
      })

      if (response.data) {
        sessionStorage.setItem("pendingEmail", formData.email)
        toast.success("Account created! Please check your email for the OTP code.")
        router.push("/verify-email")
      }
    } catch (error: any) {
      console.error("Full registration error:", error)
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.details ||
        `Failed to create account. Status: ${error.response?.status ?? "Unknown"}`
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full px-4">
      <RegistrationForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        initialEmail={invitationEmail}
        emailReadOnly={invitationMode}
        invitationMode={invitationMode}
        roleName={roleName}
      />
    </div>
  )
}

export default function SignupPage() {
  return (
    <ProductAuthShell>
      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        }
      >
        <SignupPageContent />
      </Suspense>
    </ProductAuthShell>
  )
}
