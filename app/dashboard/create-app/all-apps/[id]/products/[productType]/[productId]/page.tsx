"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Package, AlertCircle, Loader2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { productApi } from "@/lib/services/product-api"
import { formatProductApiErrorMessage } from "@/lib/formatProductApiErrorMessage"
import {
  displayMoney,
  displayOrNA,
  mapProductToConfigurationView,
} from "@/lib/productDetailView"
import ConfigureLoanDrawer from "@/components/drawers/configure-loan-drawer"
import ConfigureMortgageDrawer from "@/components/drawers/configure-mortgage-drawer"
import ConfigureSavingsDrawer from "@/components/drawers/configure-savings-drawer"
import ConfigureCommodityDrawer from "@/components/drawers/configure-commodity-drawer"
import {
  prefetchLoanConfigureOptions,
  prefetchMortgageConfigureOptions,
  prefetchSavingsConfigureOptions,
  prefetchCommodityConfigureOptions,
  type LoanConfigurePrefetched,
  type MortgageConfigurePrefetched,
  type SavingsConfigurePrefetched,
  type CommodityConfigurePrefetched,
} from "@/lib/productConfigurePrefetch"

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

function ConfigField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs text-[#A89968]">{label}</p>
      <p className="break-words text-sm text-white">{value}</p>
    </div>
  )
}

export default function ProductDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const productType = params.productType as string
  const productId = params.productId as string
  const appId = params.id as string

  const [activeTab, setActiveTab] = useState("configuration")
  const [product, setProduct] = useState<Record<string, unknown> | null>(null)
  const [configuration, setConfiguration] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [configureBusy, setConfigureBusy] = useState(false)

  const [isConfigureLoanOpen, setIsConfigureLoanOpen] = useState(false)
  const [isConfigureMortgageOpen, setIsConfigureMortgageOpen] = useState(false)
  const [isConfigureSavingsOpen, setIsConfigureSavingsOpen] = useState(false)
  const [isConfigureCommodityOpen, setIsConfigureCommodityOpen] = useState(false)
  const [loanData, setLoanData] = useState<Record<string, unknown> | null>(null)
  const [mortgageData, setMortgageData] = useState<Record<string, unknown> | null>(null)
  const [savingsData, setSavingsData] = useState<Record<string, unknown> | null>(null)
  const [commodityData, setCommodityData] = useState<Record<string, unknown> | null>(null)
  const [loanConfigurePrefetch, setLoanConfigurePrefetch] = useState<LoanConfigurePrefetched | null>(null)
  const [mortgageConfigurePrefetch, setMortgageConfigurePrefetch] = useState<MortgageConfigurePrefetched | null>(null)
  const [savingsConfigurePrefetch, setSavingsConfigurePrefetch] = useState<SavingsConfigurePrefetched | null>(null)
  const [commodityConfigurePrefetch, setCommodityConfigurePrefetch] = useState<CommodityConfigurePrefetched | null>(null)

  const loadProduct = useCallback(async () => {
    if (!productId || !appId) return
    setLoading(true)
    setLoadError(null)
    try {
      const result = await productApi.getProductDetailForApp(appId, productId)
      if (result.success && result.data) {
        const row = result.data as Record<string, unknown>
        setProduct(row)
        setConfiguration(
          (result.configuration as Record<string, unknown> | null) ??
            mapProductToConfigurationView(row),
        )
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
    if (productType === "loan" || productType === "mortgage") {
      return [
        { id: "active", label: productType === "mortgage" ? "Active Mortgage" : "Active Loan" },
        { id: "inactive", label: productType === "mortgage" ? "Inactive Mortgage" : "Inactive Loan" },
        { id: "drive", label: "Drive" },
        { id: "configuration", label: "Configuration" },
      ]
    }
    if (productType === "commodity" || productType === "investment") {
      return [
        { id: "active", label: productType === "investment" ? "Active Investment" : "Active Commodity" },
        { id: "inactive", label: productType === "investment" ? "Inactive Investment" : "Inactive Commodity" },
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
  const resolvedType = String(product?.type ?? productType ?? "").toLowerCase()

  const openConfigureDrawer = async () => {
    if (!productId) return
    setConfigureBusy(true)
    try {
      let dataStub: Record<string, unknown> = product
        ? { ...product, productId }
        : { productId }

      try {
        const fullProduct = await productApi.getProductById(productId)
        if (fullProduct?.data && typeof fullProduct.data === "object") {
          dataStub = { ...dataStub, ...(fullProduct.data as Record<string, unknown>) }
        }
      } catch {
        // Fall back to loaded product when detail fetch is unavailable.
      }

      if (resolvedType === "loan") {
        const prefetched = await prefetchLoanConfigureOptions()
        setLoanConfigurePrefetch(prefetched)
        setLoanData(dataStub)
        setIsConfigureLoanOpen(true)
      } else if (resolvedType === "mortgage") {
        const prefetched = await prefetchMortgageConfigureOptions()
        setMortgageConfigurePrefetch(prefetched)
        setMortgageData(dataStub)
        setIsConfigureMortgageOpen(true)
      } else if (resolvedType === "savings") {
        const prefetched = await prefetchSavingsConfigureOptions()
        setSavingsConfigurePrefetch(prefetched)
        setSavingsData(dataStub)
        setIsConfigureSavingsOpen(true)
      } else if (resolvedType === "commodity" || resolvedType === "investment") {
        const prefetched = await prefetchCommodityConfigureOptions(resolvedType === "investment")
        setCommodityConfigurePrefetch(prefetched)
        setCommodityData(dataStub)
        setIsConfigureCommodityOpen(true)
      } else {
        toast.error(`Configure is not available for product type “${resolvedType || "unknown"}”.`)
      }
    } catch (err) {
      console.error(err)
      toast.error(formatProductApiErrorMessage(err))
    } finally {
      setConfigureBusy(false)
    }
  }

  const saveConfiguredProduct = async (typeLabel: string, configData: Record<string, unknown>) => {
    await productApi.saveProductConfiguration(productId, typeLabel, {
      ...configData,
      status: "complete",
    })
    toast.success("Product configuration saved")
    await loadProduct()
  }

  const handleConfigureLoan = async (configData: Record<string, unknown>) => {
    try {
      await saveConfiguredProduct("Loan", configData)
      setIsConfigureLoanOpen(false)
      setLoanConfigurePrefetch(null)
    } catch (err) {
      toast.error(formatProductApiErrorMessage(err))
      throw err
    }
  }

  const handleConfigureMortgage = async (configData: Record<string, unknown>) => {
    try {
      await saveConfiguredProduct("Mortgage", configData)
      setIsConfigureMortgageOpen(false)
      setMortgageConfigurePrefetch(null)
    } catch (err) {
      toast.error(formatProductApiErrorMessage(err))
      throw err
    }
  }

  const handleConfigureSavings = async (configData: Record<string, unknown>) => {
    try {
      await saveConfiguredProduct("Savings", configData)
      setIsConfigureSavingsOpen(false)
      setSavingsConfigurePrefetch(null)
    } catch (err) {
      toast.error(formatProductApiErrorMessage(err))
      throw err
    }
  }

  const handleConfigureCommodity = async (configData: Record<string, unknown>) => {
    try {
      const label = resolvedType === "investment" ? "Investment" : "Commodity"
      await saveConfiguredProduct(label, configData)
      setIsConfigureCommodityOpen(false)
      setCommodityConfigurePrefetch(null)
    } catch (err) {
      toast.error(formatProductApiErrorMessage(err))
      throw err
    }
  }

  const renderConfiguration = () => {
    if (!configuration) {
      return (
        <div className="rounded-lg border border-gray-200 p-12 text-center">
          <div className="mb-4 text-gray-400">
            <Plus className="mx-auto h-12 w-12" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Configuration</h3>
          <p className="mb-4 text-gray-600">
            This product has not been fully configured yet, or configuration uses a legacy shape.
          </p>
          <Button
            className="bg-[#9A813F] text-white hover:bg-[#8a7435]"
            disabled={configureBusy}
            onClick={() => void openConfigureDrawer()}
          >
            {configureBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Configure Product
          </Button>
        </div>
      )
    }

    const cfg = configuration
    const currency = typeof cfg.currency === "string" ? cfg.currency : "NGN"
    const interest = cfg.interestRate as { display?: string; value?: string | number; type?: string } | undefined
    const tenure = cfg.loanTenure as { display?: string; value?: string; unit?: string } | undefined
    const penalty = cfg.penalty as { display?: string; value?: string | number; type?: string } | undefined
    const withdrawalPenalty = cfg.withdrawalPenalty as
      | { display?: string; value?: string | number; type?: string }
      | undefined
    const otherFees = Array.isArray(cfg.otherFees) ? cfg.otherFees : []
    const interestDisplay =
      interest?.display ||
      (interest?.value != null && String(interest.value) !== ""
        ? `${interest.value}${String(interest.type || "").toLowerCase().includes("percent") ? "%" : ""}`
        : null)
    const tenureDisplay =
      tenure?.display ||
      (tenure?.value
        ? tenure.unit
          ? `${tenure.value} ${tenure.unit}(s)`
          : String(tenure.value)
        : null)

    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-[#2C2416] p-6">
          <h3 className="mb-6 text-lg font-semibold text-white">Product Information</h3>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-4">
              <ConfigField label="Name" value={productName} />
              <ConfigField label="Type" value={displayOrNA(product?.type)} />
            </div>
            <div className="space-y-4">
              <ConfigField label="Reference" value={displayOrNA(product?.referenceNumber)} />
              <ConfigField label="Status" value={<span className="capitalize">{displayOrNA(product?.status)}</span>} />
            </div>
            <div className="space-y-4">
              <ConfigField label="Purpose" value={displayOrNA(cfg.purpose)} />
              <ConfigField label="Currency" value={displayOrNA(currency)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-[#2C2416] p-6">
          <h3 className="mb-6 text-lg font-semibold text-white">
            {resolvedType === "mortgage" ? "Mortgage Amount" : "Facility Amount"}
          </h3>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {resolvedType === "mortgage" ? (
              <ConfigField
                label="Mortgage Amount"
                value={displayMoney(
                  typeof cfg.mortgageAmount === "number"
                    ? cfg.mortgageAmount
                    : typeof cfg.maximumFacilityAmount === "number"
                      ? cfg.maximumFacilityAmount
                      : undefined,
                  currency,
                )}
              />
            ) : (
              <>
                <ConfigField
                  label="Minimum Amount"
                  value={displayMoney(
                    typeof cfg.minimumFacilityAmount === "number" ? cfg.minimumFacilityAmount : undefined,
                    currency,
                  )}
                />
                <ConfigField
                  label="Maximum Amount"
                  value={displayMoney(
                    typeof cfg.maximumFacilityAmount === "number" ? cfg.maximumFacilityAmount : undefined,
                    currency,
                  )}
                />
              </>
            )}
            <ConfigField label="Interest Rate" value={displayOrNA(interestDisplay)} />
            <ConfigField label="Interest Method" value={displayOrNA(cfg.interestMethod)} />
          </div>
        </div>

        <div className="rounded-lg bg-[#2C2416] p-6">
          <h3 className="mb-6 text-lg font-semibold text-white">Tenure & Repayment</h3>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <ConfigField label={resolvedType === "mortgage" ? "Mortgage Tenure" : "Loan Tenure"} value={displayOrNA(tenureDisplay)} />
            <ConfigField label="Repayment Cycle" value={<span className="capitalize">{displayOrNA(cfg.repaymentCycle)}</span>} />
            <ConfigField label="Repayment Workflow" value={displayOrNA(cfg.repaymentWorkflow)} />
            <ConfigField label="Amortization Schedule" value={displayOrNA(cfg.amortizationSchedule)} />
            <ConfigField label="Acceptable NPL" value={displayOrNA(cfg.acceptableNpa)} />
            <ConfigField
              label="Minimum Repayment"
              value={displayMoney(
                typeof cfg.minimumRepaymentAmount === "number" ? cfg.minimumRepaymentAmount : undefined,
                currency,
              )}
            />
            {cfg.equityRequirement != null && String(cfg.equityRequirement).trim() ? (
              <ConfigField label="Equity Requirement" value={displayOrNA(cfg.equityRequirement)} />
            ) : null}
            {typeof cfg.equityContribution === "number" ? (
              <ConfigField label="Equity Contribution" value={displayOrNA(cfg.equityContribution)} />
            ) : null}
          </div>
        </div>

        <div className="rounded-lg bg-[#2C2416] p-6">
          <h3 className="mb-6 text-lg font-semibold text-white">Fees & Penalties</h3>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <ConfigField
              label="Management Fee"
              value={
                cfg.managementFeeDisplay != null
                  ? `${String(cfg.managementFeeType || "Flat")} · ${String(cfg.managementFeeDisplay)}`
                  : displayOrNA(cfg.managementFee)
              }
            />
            <ConfigField label="Late Repayment Penalty" value={displayOrNA(penalty?.display ?? penalty?.value)} />
            <ConfigField
              label="Withdrawal Penalty"
              value={displayOrNA(withdrawalPenalty?.display ?? withdrawalPenalty?.value)}
            />
            {otherFees.map((fee) => {
              const row = fee as { name?: string; feeType?: string; display?: string }
              return (
                <ConfigField
                  key={row.name}
                  label={row.name || "Fee"}
                  value={`${row.feeType || "Flat"} · ${row.display || "—"}`}
                />
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (activeTab === "active" || activeTab === "inactive") {
      const tabLabel = activeTab === "active" ? "Active" : "Inactive"
      const productLabel =
        productType === "loan"
          ? "Loans"
          : productType === "mortgage"
            ? "Mortgages"
            : productType === "savings"
              ? "Savings"
              : productType === "commodity"
                ? "Commodities"
                : "Items"

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
      return renderConfiguration()
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
          <Button
            className="mb-2 gap-2 bg-black text-white hover:bg-gray-800"
            disabled={configureBusy}
            onClick={() => void openConfigureDrawer()}
          >
            {configureBusy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Configure
          </Button>
        ) : null}
      </div>

      {renderContent()}

      <ConfigureLoanDrawer
        isOpen={isConfigureLoanOpen}
        onClose={() => {
          setIsConfigureLoanOpen(false)
          setLoanConfigurePrefetch(null)
        }}
        onSubmit={handleConfigureLoan}
        loanData={loanData}
        prefetchedOptions={loanConfigurePrefetch}
      />
      <ConfigureMortgageDrawer
        isOpen={isConfigureMortgageOpen}
        onClose={() => {
          setIsConfigureMortgageOpen(false)
          setMortgageConfigurePrefetch(null)
        }}
        onSubmit={handleConfigureMortgage}
        mortgageData={mortgageData}
        prefetchedOptions={mortgageConfigurePrefetch}
      />
      <ConfigureSavingsDrawer
        isOpen={isConfigureSavingsOpen}
        onClose={() => {
          setIsConfigureSavingsOpen(false)
          setSavingsConfigurePrefetch(null)
        }}
        onSubmit={handleConfigureSavings}
        savingsData={savingsData}
        prefetchedOptions={savingsConfigurePrefetch}
      />
      <ConfigureCommodityDrawer
        isOpen={isConfigureCommodityOpen}
        onClose={() => {
          setIsConfigureCommodityOpen(false)
          setCommodityConfigurePrefetch(null)
        }}
        onSubmit={handleConfigureCommodity}
        commodityData={commodityData}
        variant={resolvedType === "investment" ? "investment" : "commodity"}
        prefetchedOptions={commodityConfigurePrefetch}
      />
    </div>
  )
}
