"use client"

import type React from "react"
import { useEffect } from "react"
import DashboardSidebar from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { appApi } from "@/lib/services/appService"

function DashboardSessionPrefetch() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user?.id) return
    void appApi.getAllApps().catch(() => undefined)
  }, [user?.id])
  return null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isScamAlertPage = pathname?.includes("/scam-alert")

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSessionPrefetch />
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isScamAlertPage && <DashboardHeader />}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
