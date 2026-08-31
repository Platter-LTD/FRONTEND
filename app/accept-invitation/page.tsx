"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { teamApi } from "@/lib/services/teamService"
import { ProductAuthShell } from "@/components/product-auth-shell"

function AcceptInvitationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = (searchParams.get("token") || "").trim()

  const [validateError, setValidateError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setValidateError("Missing invitation token.")
      return
    }
    let cancelled = false
    void teamApi.validateInvitation(token).then((res) => {
      if (cancelled) return
      if (!res.success) {
        setValidateError(res.error || "Invalid or expired invitation.")
        return
      }
      const email = res.data?.email?.trim()
      if (!email) {
        setValidateError("Invitation is valid but no email was returned. Please contact your admin.")
        return
      }
      const params = new URLSearchParams({
        email,
        token,
        invitation: "1",
      })
      const roleName = res.data?.roleName?.trim()
      if (roleName) params.set("role", roleName)
      router.replace(`/signup?${params.toString()}`)
    })
    return () => {
      cancelled = true
    }
  }, [router, token])

  if (validateError) {
    return (
      <div className="space-y-4 text-center py-10">
        <h1 className="text-xl font-semibold text-gray-900">Invitation unavailable</h1>
        <p className="text-sm text-gray-600">{validateError}</p>
        <Button asChild className="bg-black text-white hover:bg-gray-800">
          <Link href="/signin">Go to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
      <Loader2 className="w-5 h-5 animate-spin" />
      Validating invitation…
    </div>
  )
}

export default function AcceptInvitationPage() {
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
        <AcceptInvitationForm />
      </Suspense>
    </ProductAuthShell>
  )
}
