"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardRedirectSkeleton } from "@/components/ui/app-loading-skeleton"

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/create-app/all-apps")
  }, [router])

  return <DashboardRedirectSkeleton />
}
