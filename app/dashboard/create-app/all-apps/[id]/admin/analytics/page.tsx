"use client"

import { useParams } from "next/navigation"
import PlataAnalyticsDashboard from "@/components/analytics/PlataAnalyticsDashboard"

/** Per-app Admin → Analytics */
export default function AppAdminAnalyticsPage() {
  const params = useParams<{ id: string }>()
  const appId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined
  return <PlataAnalyticsDashboard appId={appId} />
}
