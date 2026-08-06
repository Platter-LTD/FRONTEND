"use client"

import ProductOverviewDashboard from "@/components/analytics/ProductOverviewDashboard"

/** @deprecated Prefer in-app Admin → Analytics under create-app. */
export default function AdminAnalyticsPage() {
  return (
    <div className="min-h-full w-full bg-[#FAFAF9]">
      <ProductOverviewDashboard />
    </div>
  )
}
