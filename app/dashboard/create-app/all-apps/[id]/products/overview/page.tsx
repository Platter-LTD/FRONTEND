"use client"

import { useParams } from "next/navigation"
import ProductOverviewDashboard from "@/components/analytics/ProductOverviewDashboard"

/**
 * Products → Product Overview
 * Live activity by product type (loan, mortgage, savings, investment, commodity).
 */
export default function ProductsOverviewPage() {
  const params = useParams<{ id: string }>()
  const appId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined

  return (
    <div className="min-h-full w-full bg-[#FAFAF9]">
      <ProductOverviewDashboard appId={appId} />
    </div>
  )
}
