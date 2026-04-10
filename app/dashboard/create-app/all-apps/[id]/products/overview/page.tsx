"use client"

import { useState, useEffect } from "react"
import { Package } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { productApi } from "@/lib/services/product-api"
import { ProductDebugPanel } from "@/components/product-debug-panel"
import { Skeleton } from "@/components/ui/skeleton"

type OverviewHeadline = {
  requestedAmount?: number
  approvedAmount?: number
  totalTransactions?: number
  totalSavings?: number
  totalInterest?: number
}

type OverviewCategory = {
  type?: string
  configuredProductCount?: number
  customerCount?: number
  capitalAmount?: number
  issuedAmount?: number
  repaymentAmount?: number
  inventoryAmount?: number
  salesAmount?: number
}

const formatMoney = (value: number | undefined) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? Number(value) : 0)

const findCategory = (categories: OverviewCategory[], type: string) =>
  categories.find((x) => String(x.type || "").toUpperCase() === type.toUpperCase())

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("general")
  const params = useParams()
  const router = useRouter()
  const appId = params.id as string
  const [headline, setHeadline] = useState<OverviewHeadline | null>(null)
  const [categories, setCategories] = useState<OverviewCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load product overview aggregates for this app
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await productApi.getProductOverview(appId)
        const payload = (data as { data?: { headline?: OverviewHeadline; byCategory?: OverviewCategory[] } }).data
        setHeadline(payload?.headline || {})
        setCategories(Array.isArray(payload?.byCategory) ? payload.byCategory : [])
      } catch (error) {
        console.error("Error fetching product overview:", error)
        setHeadline(null)
        setCategories([])
        setError(error instanceof Error ? error.message : "Failed to load product overview")
      } finally {
        setLoading(false)
      }
    }

    if (appId) void fetchOverview()
  }, [appId])

  // Handle product card click - navigate to product type page
  const handleProductClick = (type: string) => {
    router.push(`/dashboard/create-app/all-apps/${appId}/products/${type}`)
  }

  const productCards = [
    {
      title: "Mortgage Products",
      count: findCategory(categories, "MORTGAGE")?.configuredProductCount || 0,
      customers: findCategory(categories, "MORTGAGE")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "MORTGAGE")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "MORTGAGE")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "MORTGAGE")?.repaymentAmount),
      type: "mortgage",
    },
    {
      title: "Loan Products",
      count: findCategory(categories, "LOAN")?.configuredProductCount || 0,
      customers: findCategory(categories, "LOAN")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "LOAN")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "LOAN")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "LOAN")?.repaymentAmount),
      type: "loan",
    },
    {
      title: "Saving Products",
      count: findCategory(categories, "SAVINGS")?.configuredProductCount || 0,
      customers: findCategory(categories, "SAVINGS")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "SAVINGS")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "SAVINGS")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "SAVINGS")?.repaymentAmount),
      type: "savings",
    },
    {
      title: "Investment Products",
      count: findCategory(categories, "INVESTMENT")?.configuredProductCount || 0,
      customers: findCategory(categories, "INVESTMENT")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "INVESTMENT")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "INVESTMENT")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "INVESTMENT")?.repaymentAmount),
      type: "investment",
    },
    {
      title: "Commodity Products",
      count: findCategory(categories, "COMMODITY")?.configuredProductCount || 0,
      customers: findCategory(categories, "COMMODITY")?.customerCount || 0,
      inventory: formatMoney(findCategory(categories, "COMMODITY")?.inventoryAmount),
      sales: formatMoney(findCategory(categories, "COMMODITY")?.salesAmount),
      repayment: formatMoney(findCategory(categories, "COMMODITY")?.repaymentAmount),
      type: "commodity",
    },
  ]

  return (
    <div className="flex-1 bg-white p-8">
      {/* Product Overview Heading */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Product Overview</h1>
      {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}

      {/* Stats Card */}
      <div className="bg-[#2C2C3E] rounded-lg p-8 mb-8 grid grid-cols-5 gap-8">
        <div>
          <p className="text-gray-400 text-sm mb-2">Requested</p>
          {loading ? (
            <Skeleton className="h-8 w-28 bg-gray-600/70" />
          ) : (
            <p className="text-white text-2xl font-semibold mb-1">{formatMoney(headline?.requestedAmount)}</p>
          )}
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Approved</p>
          {loading ? (
            <Skeleton className="h-8 w-28 bg-gray-600/70" />
          ) : (
            <p className="text-white text-2xl font-semibold mb-1">{formatMoney(headline?.approvedAmount)}</p>
          )}
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Total Transactions</p>
          {loading ? (
            <Skeleton className="h-8 w-28 bg-gray-600/70" />
          ) : (
            <p className="text-white text-2xl font-semibold mb-1">{formatMoney(headline?.totalTransactions)}</p>
          )}
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Total Savings</p>
          {loading ? (
            <Skeleton className="h-8 w-28 bg-gray-600/70" />
          ) : (
            <p className="text-white text-2xl font-semibold mb-1">{formatMoney(headline?.totalSavings)}</p>
          )}
        </div>
        <div>
          <p className="text-gray-400 text-sm mb-2">Total interest</p>
          {loading ? (
            <Skeleton className="h-8 w-28 bg-gray-600/70" />
          ) : (
            <p className="text-white text-2xl font-semibold mb-1">{formatMoney(headline?.totalInterest)}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("general")}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === "general" ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            General Info
            {activeTab === "general" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]"></div>}
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === "customers" ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Customers
            {activeTab === "customers" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]"></div>}
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === "transactions" ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Transactions
            {activeTab === "transactions" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]"></div>
            )}
          </button>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {productCards.map((card, index) => (
          <div key={index} className="flex flex-col gap-4">
            <button
              onClick={() => handleProductClick(card.type)}
              className="bg-[#8B7355] rounded-lg p-6 flex items-center justify-between hover:bg-[#7A6449] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <Package className="text-white" size={24} />
                <div>
                  <p className="text-white text-sm font-medium">{card.title}</p>
                </div>
              </div>
              {loading ? (
                <Skeleton className="h-10 w-10 bg-white/30" />
              ) : (
                <div className="text-white text-4xl font-bold">{card.count}</div>
              )}
            </button>

            {/* Details */}
            <div className="space-y-3">
              <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Customers</span>
                {loading ? (
                  <Skeleton className="h-4 w-10" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{card.customers}</span>
                )}
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">{index === 3 ? "Inventory" : "Capital"}</span>
                {loading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{index === 3 ? card.inventory : card.capital}</span>
                )}
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">{index === 3 ? "Sales" : "Issued"}</span>
                {loading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{index === 3 ? card.sales : card.issued}</span>
                )}
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Repayment</span>
                {loading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{card.repayment}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Debug Panel - Remove after fixing the issue */}
      <ProductDebugPanel appId={appId} location="platter" />
    </div>
  )
}
