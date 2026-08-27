"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import TextInput from "@/components/text-input"
import { teamApi } from "@/lib/services/teamService"
import { ProductAuthShell } from "@/components/product-auth-shell"

function AcceptInvitationForm() {
  const searchParams = useSearchParams()
  const token = (searchParams.get("token") || "").trim()

  const [validating, setValidating] = useState(true)
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)
  const [validateError, setValidateError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setValidating(false)
      setValidateError("Missing invitation token.")
      return
    }
    let cancelled = false
    void teamApi.validateInvitation(token).then((res) => {
      if (cancelled) return
      setValidating(false)
      if (!res.success) {
        setValidateError(res.error || "Invalid or expired invitation.")
        return
      }
      setInviteEmail(res.data?.email || null)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    if (!firstName.trim() || !lastName.trim() || !password) {
      setSubmitError("First name, last name, and password are required.")
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    const res = await teamApi.acceptInvitation({
      token,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password,
    })
    setSubmitting(false)
    if (!res.success) {
      setSubmitError(res.error || "Failed to accept invitation.")
      return
    }
    setDone(true)
  }

  if (validating) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
        <Loader2 className="w-5 h-5 animate-spin" />
        Validating invitation…
      </div>
    )
  }

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

  if (done) {
    return (
      <div className="space-y-4 text-center py-10">
        <h1 className="text-xl font-semibold text-gray-900">You&apos;re in</h1>
        <p className="text-sm text-gray-600">
          Your account was created
          {inviteEmail ? (
            <>
              {" "}
              for <strong>{inviteEmail}</strong>
            </>
          ) : null}
          . Sign in to continue.
        </p>
        <Button asChild className="bg-[#9A813F] text-white hover:bg-[#8A7335]">
          <Link href="/signin">Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-md mx-auto w-full">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Accept invitation</h1>
        <p className="text-sm text-gray-600">
          {inviteEmail
            ? `Join the team as ${inviteEmail}`
            : "Set your name and password to join the team."}
        </p>
      </div>

      <TextInput
        label="First name"
        placeholder="First name"
        value={firstName}
        onChange={setFirstName}
        accentColor="#9A813F"
      />
      <TextInput
        label="Last name"
        placeholder="Last name"
        value={lastName}
        onChange={setLastName}
        accentColor="#9A813F"
      />
      <TextInput
        label="Password"
        placeholder="Create a password"
        type="password"
        value={password}
        onChange={setPassword}
        accentColor="#9A813F"
      />

      {submitError ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {submitError}
        </p>
      ) : null}

      <Button
        className="w-full bg-black text-white hover:bg-gray-800"
        disabled={submitting}
        onClick={() => void handleAccept()}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating account…
          </>
        ) : (
          "Join team"
        )}
      </Button>
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
