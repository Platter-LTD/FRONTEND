"use client"

import { useParams } from "next/navigation"
import { WithdrawalsConsole } from "@/components/wallets/withdrawals-console"

export default function WithdrawalsPage() {
  const params = useParams()
  const appId = params.id as string

  return <WithdrawalsConsole appId={appId} />
}
