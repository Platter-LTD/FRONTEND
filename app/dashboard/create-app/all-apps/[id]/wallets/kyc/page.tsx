"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

/** Legacy /wallets/kyc → /wallets/repayment */
export default function KycWalletRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const appId = params.id as string

  useEffect(() => {
    if (!appId) return
    router.replace(`/dashboard/create-app/all-apps/${appId}/wallets/repayment`)
  }, [appId, router])

  return null
}
