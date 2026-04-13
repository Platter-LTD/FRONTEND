"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, MoreVertical, Copy, Package, AlertCircle } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { productApi } from "@/lib/services/product-api"

function ProductDetailSkeleton() {
  return (
    <div className="flex-1 bg-white p-8">
      <Skeleton className="mb-6 h-9 w-[min(100%,320px)] max-w-full" />
      <div className="mb-6 flex gap-8 border-b border-gray-200 pb-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function ProductDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const productType = params.productType as string
  const productId = params.productId as string
  const appId = params.id as string

  const [activeTab, setActiveTab] = useState("active")
  const [product, setProduct] = useState<Record<string, unknown> | null>(null)
  const [configuration, setConfiguration] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadProduct = useCallback(async () => {
    if (!productId || !appId) return
    setLoading(true)
    setLoadError(null)
    try {
      const result = await productApi.getProductDetailForApp(appId, productId)
      if (result.success && result.data) {
        setProduct(result.data as Record<string, unknown>)
        setConfiguration((result.configuration as Record<string, unknown> | null) ?? null)
      } else {
        setProduct(null)
        setConfiguration(null)
        setLoadError(result.error || "Product not found")
      }
    } catch (error) {
      console.error("Error fetching product:", error)
      setProduct(null)
      setConfiguration(null)
      setLoadError(error instanceof Error ? error.message : "Failed to load product")
    } finally {
      setLoading(false)
    }
  }, [appId, productId])

  useEffect(() => {
    void loadProduct()
  }, [loadProduct])

  const getTabsForProduct = () => {
    if (productType === "savings") {
      return [
        { id: "active", label: "Active Savings" },
        { id: "inactive", label: "Inactive Savings" },
        { id: "configuration", label: "Configuration" },
      ]
    }
    if (productType === "loan") {
      return [
        { id: "active", label: "Active Loan" },
        { id: "inactive", label: "Inactive Loan" },
        { id: "drive", label: "Drive" },
        { id: "configuration", label: "Configuration" },
      ]
    }
    if (productType === "commodity") {
      return [
        { id: "active", label: "Active Commodity" },
        { id: "inactive", label: "Inactive Commodity" },
        { id: "configuration", label: "Configuration" },
      ]
    }
    return [
      { id: "active", label: "Active Loan" },
      { id: "inactive", label: "Inactive Loan" },
      { id: "drive", label: "Drive" },
      { id: "configuration", label: "Configuration" },
    ]
  }

  const tabs = getTabsForProduct()

  const productName = typeof product?.name === "string" ? product.name : "Product"

  const renderContent = () => {
    if (activeTab === "active" || activeTab === "inactive") {
      const tabLabel = activeTab === "active" ? "Active" : "Inactive"
      const productLabel =
        productType === "loan" ? "Loans" : productType === "savings" ? "Savings" : productType === "commodity" ? "Commodities" : "Items"

      return (
        <div className="rounded-lg border border-gray-200 p-12 text-center">
          <div className="mb-4 text-gray-400">
            <Package className="mx-auto h-12 w-12" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No {tabLabel} {productLabel}
          </h3>
          <p className="mb-4 text-gray-600">
            {activeTab === "active"
              ? `There are no active ${productLabel.toLowerCase()} for this product yet.`
              : `There are no inactive ${productLabel.toLowerCase()} for this product.`}
          </p>
          <p className="text-sm text-gray-500">
            When customers subscribe to this product, their {productLabel.toLowerCase()} will appear here.
          </p>
        </div>
      )
    }

    if (activeTab === "drive") {
      return (
        <div>
          <div className="mb-6 flex justify-end">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search documents" className="pl-10" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-12 text-center">
            <div className="mb-4 text-gray-400">
              <Package className="mx-auto h-12 w-12" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">No Documents</h3>
            <p className="mb-4 text-gray-600">No documents have been submitted for this product yet.</p>
            <p className="text-sm text-gray-500">When customers submit documents for verification, they will appear here.</p>
          </div>
        </div>
      )
    }

    if (activeTab === "configuration") {
      if (!configuration) {
        return (
          <div className="rounded-lg border border-gray-200 p-12 text-center">
            <div className="mb-4 text-gray-400">
              <Plus className="mx-auto h-12 w-12" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">No Configuration</h3>
            <p className="mb-4 text-gray-600">This product has not been fully configured yet, or configuration uses a legacy shape.</p>
            <Button className="bg-[#9A813F] text-white hover:bg-[#8a7435]">
              <Plus className="mr-2 h-4 w-4" />
              Configure Product
            </Button>
          </div>
        )
      }

      const cfg = configuration as {
        purpose?: string
        currency?: string
        minimumFacilityAmount?: number
        maximumFacilityAmount?: number
        interestRate?: { value?: string | number; type?: string }
        loanTenure?: { value?: string; unit?: string }
        repaymentCycle?: string
        minimumRepaymentAmount?: number
        managementFee?: number
        penalty?: { value?: string | number; type?: string }
        withdrawalPenalty?: { value?: string | number; type?: string }
      }

      return (
        <div className="space-y-6">
          <div className="rounded-lg bg-[#2C2416] p-6">
            <h3 className="mb-6 text-lg font-semibold text-white">Product Information</h3>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Name</p>
                <p className="text-sm text-white">{productName}</p>
                <p className="mb-2 mt-4 text-xs text-[#A89968]">Type</p>
                <p className="text-sm text-white">{String(product?.type ?? "N/A")}</p>
              </div>
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Reference</p>
                <p className="text-sm text-white">{String(product?.referenceNumber ?? "N/A")}</p>
                <p className="mb-2 mt-4 text-xs text-[#A89968]">Status</p>
                <p className="text-sm capitalize text-white">{String(product?.status ?? "N/A")}</p>
              </div>
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Purpose</p>
                <p className="text-sm text-white">{cfg.purpose || "N/A"}</p>
                <p className="mb-2 mt-4 text-xs text-[#A89968]">Currency</p>
                <p className="text-sm text-white">{cfg.currency || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-[#2C2416] p-6">
            <h3 className="mb-6 text-lg font-semibold text-white">Facility Amount</h3>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Minimum Amount</p>
                <p className="text-sm text-white">
                  {cfg.minimumFacilityAmount != null
                    ? `${cfg.currency || ""}${cfg.minimumFacilityAmount.toLocaleString()}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Maximum Amount</p>
                <p className="text-sm text-white">
                  {cfg.maximumFacilityAmount != null
                    ? `${cfg.currency || ""}${cfg.maximumFacilityAmount.toLocaleString()}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Interest Rate</p>
                <p className="text-sm text-white">
                  {cfg.interestRate?.value != null && cfg.interestRate.value !== ""
                    ? `${cfg.interestRate.value}${cfg.interestRate.type === "percentage" ? "%" : ""}`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-[#2C2416] p-6">
            <h3 className="mb-6 text-lg font-semibold text-white">Tenure & Repayment</h3>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Loan Tenure</p>
                <p className="text-sm text-white">
                  {cfg.loanTenure?.value
                    ? cfg.loanTenure.unit
                      ? `${cfg.loanTenure.value} ${cfg.loanTenure.unit}(s)`
                      : String(cfg.loanTenure.value)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Repayment Cycle</p>
                <p className="text-sm capitalize text-white">{cfg.repaymentCycle || "N/A"}</p>
              </div>
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Minimum Repayment</p>
                <p className="text-sm text-white">
                  {cfg.minimumRepaymentAmount != null
                    ? `${cfg.currency || ""}${cfg.minimumRepaymentAmount.toLocaleString()}`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-[#2C2416] p-6">
            <h3 className="mb-6 text-lg font-semibold text-white">Fees & Penalties</h3>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Management Fee</p>
                <p className="text-sm text-white">
                  {cfg.managementFee !== undefined
                    ? `${cfg.currency || ""}${cfg.managementFee.toLocaleString()}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Penalty</p>
                <p className="text-sm text-white">
                  {cfg.penalty?.value != null && cfg.penalty.value !== ""
                    ? `${cfg.penalty.value}${cfg.penalty.type === "percentage" ? "%" : ""}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs text-[#A89968]">Withdrawal Penalty</p>
                <p className="text-sm text-white">
                  {cfg.withdrawalPenalty?.value != null && cfg.withdrawalPenalty.value !== ""
                    ? `${cfg.withdrawalPenalty.value}${cfg.withdrawalPenalty.type === "percentage" ? "%" : ""}`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <p>No data available for this tab.</p>
      </div>
    )
  }

  if (!productType || !productId) {
    return null
  }

  if (loading) {
    return <ProductDetailSkeleton />
  }

  if (!product) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-white p-8">
        <AlertCircle className="mb-4 h-12 w-12 text-amber-500" aria-hidden />
        <p className="mb-2 text-center text-gray-900">{loadError || "Product not found"}</p>
        <p className="mb-6 max-w-md text-center text-sm text-gray-600">
          The link may use a reference code that does not match this app, or the product was removed.
        </p>
        <Button
          variant="outline"
          className="border-[#c9b271] text-[#77642f]"
          onClick={() => router.push(`/dashboard/create-app/all-apps/${appId}/products/${productType.toLowerCase()}`)}
        >
          Back to products
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{productName}</h1>

      <div className="mb-6 flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {activeTab === tab.id ? <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]" /> : null}
            </button>
          ))}
        </div>
        {activeTab === "configuration" ? (
          <Button className="mb-2 gap-2 bg-black text-white hover:bg-gray-800">
            <Plus size={16} />
            Configure
          </Button>
        ) : null}
      </div>

      {renderContent()}
    </div>
  )
}
