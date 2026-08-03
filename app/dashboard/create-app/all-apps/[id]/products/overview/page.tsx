"use client"

import ProductOverviewDashboard from "@/components/analytics/ProductOverviewDashboard"

/**
 * Products → Product Overview
 * Live activity by product type (loan, mortgage, savings, investment, commodity).
 */
export default function ProductsOverviewPage() {
  return (
    <div className="min-h-full w-full bg-[#FAFAF9]">
      <ProductOverviewDashboard />
    </div>
  )
}
