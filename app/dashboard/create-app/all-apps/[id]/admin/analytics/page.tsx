"use client"

import ProductOverviewDashboard from "@/components/analytics/ProductOverviewDashboard"

/**
 * Analytics route now surfaces the Product overview experience
 * (per-product KPIs, repayments, mortgage savings review).
 */
export default function AppAdminAnalyticsPage() {
  return (
    <div className="min-h-full w-full bg-[#FAFAF9]">
      <ProductOverviewDashboard />
    </div>
  )
}
