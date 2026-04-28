"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Package, ExternalLink, AlertCircle, RefreshCw, Loader2, MoreVertical, Pencil, Power } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import CreateProductDrawer from "@/components/drawers/create-product-drawer"
import CreateLoanDrawer from "@/components/drawers/create-loan-drawer"
import CreateMortgageDrawer from "@/components/drawers/create-mortgage-drawer"
import CreateSavingsDrawer from "@/components/drawers/create-savings-drawer"
import CreateCommodityDrawer from "@/components/drawers/create-commodity-drawer"
import ConfigureLoanDrawer from "@/components/drawers/configure-loan-drawer"
import ConfigureMortgageDrawer from "@/components/drawers/configure-mortgage-drawer"
import ConfigureSavingsDrawer from "@/components/drawers/configure-savings-drawer"
import ConfigureCommodityDrawer from "@/components/drawers/configure-commodity-drawer"
import ProcessingDrawer from "@/components/drawers/processing-drawer"
import LoanCreatedSuccessDrawer from "@/components/drawers/loan-created-success-drawer"
import MortgageCreatedSuccessDrawer from "@/components/drawers/mortgage-created-success-drawer"
import SavingsCreatedSuccessDrawer from "@/components/drawers/savings-created-success-drawer"
import CommodityCreatedSuccessDrawer from "@/components/drawers/commodity-created-success-drawer"
import { productApi } from "@/lib/services/product-api"
import { formatProductApiErrorMessage } from "@/lib/formatProductApiErrorMessage"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export default function ProductsPage() {
  const params = useParams()
  const router = useRouter()
  const appId = params.id as string
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState("all")

  // Loan states
  const [isCreateLoanOpen, setIsCreateLoanOpen] = useState(false)
  const [isConfigureLoanOpen, setIsConfigureLoanOpen] = useState(false)
  const [isLoanSuccessOpen, setIsLoanSuccessOpen] = useState(false)
  const [loanData, setLoanData] = useState<any>(null)
  const [configuringProductId, setConfiguringProductId] = useState<string | null>(null)
  const [configuringProductType, setConfiguringProductType] = useState<string | null>(null)
  const [configuringProductStatus, setConfiguringProductStatus] = useState<string | null>(null)
  const [prefetchingProductId, setPrefetchingProductId] = useState<string | null>(null)
  const [loanConfigurePrefetch, setLoanConfigurePrefetch] = useState<LoanConfigurePrefetched | null>(null)
  const [mortgageConfigurePrefetch, setMortgageConfigurePrefetch] = useState<MortgageConfigurePrefetched | null>(null)
  const [savingsConfigurePrefetch, setSavingsConfigurePrefetch] = useState<SavingsConfigurePrefetched | null>(null)
  const [commodityConfigurePrefetch, setCommodityConfigurePrefetch] = useState<CommodityConfigurePrefetched | null>(null)

  // Mortgage states
  const [isCreateMortgageOpen, setIsCreateMortgageOpen] = useState(false)
  const [isConfigureMortgageOpen, setIsConfigureMortgageOpen] = useState(false)
  const [isMortgageSuccessOpen, setIsMortgageSuccessOpen] = useState(false)
  const [mortgageData, setMortgageData] = useState<any>(null)

  // Savings states
  const [isCreateSavingsOpen, setIsCreateSavingsOpen] = useState(false)
  const [isConfigureSavingsOpen, setIsConfigureSavingsOpen] = useState(false)
  const [isSavingsSuccessOpen, setIsSavingsSuccessOpen] = useState(false)
  const [savingsData, setSavingsData] = useState<any>(null)

  // Commodity / Investment creation uses the same drawer & flow
  const [isCreateCommodityOpen, setIsCreateCommodityOpen] = useState(false)
  const [isConfigureCommodityOpen, setIsConfigureCommodityOpen] = useState(false)
  const [isCommoditySuccessOpen, setIsCommoditySuccessOpen] = useState(false)
  const [commodityData, setCommodityData] = useState<any>(null)
  const [currentCreateType, setCurrentCreateType] = useState<string | null>(null)

  // Processing state
  const [isProcessingOpen, setIsProcessingOpen] = useState(false)

  const fetchProducts = useCallback(async () => {
    if (!appId) return
    setLoading(true)
    setError(null)
    try {
      const data = await productApi.getProductsByAppId(appId)
      if (data?.data != null && Array.isArray(data.data)) {
        setProducts(data.data)
        setError(null)
      } else {
        setProducts([])
        setError(data?.error || "Failed to load products")
      }
    } catch (err) {
      console.error("Error fetching products:", err)
      setProducts([])
      setError("Failed to load products. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [appId])

  useEffect(() => {
    if (appId) fetchProducts()
  }, [appId, fetchProducts])

  const typeOptions = Array.from(
    new Set(
      products
        .map((p) => (p?.type ? String(p.type).toLowerCase() : null))
        .filter((v): v is string => Boolean(v)),
    ),
  ).sort((a, b) => a.localeCompare(b))

  const filteredProducts =
    typeFilter === "all"
      ? products
      : products.filter((product) => String(product?.type ?? "").toLowerCase() === typeFilter.toLowerCase())

  const handleProductCreated = (product: any) => {
    // Add the new product to the list (this will be called from the form page)
    setProducts(prevProducts => [...prevProducts, product])
  }

  const handleProductSelect = (productType: string) => {
    setIsCreateProductOpen(false)
    setCurrentCreateType(productType)
    if (productType === "loan") {
      setIsCreateLoanOpen(true)
    } else if (productType === "mortgage") {
      setIsCreateMortgageOpen(true)
    } else if (productType === "savings") {
      setIsCreateSavingsOpen(true)
    } else if (productType === "commodity") {
      setIsCreateCommodityOpen(true)
    } else if (productType === "investment") {
      // Reuse the same creation drawer & flow as commodity
      setIsCreateCommodityOpen(true)
    }
  }

  // Back handlers to return to product selection
  const handleBackToProductSelection = () => {
    // Close all product creation drawers
    setIsCreateLoanOpen(false)
    setIsCreateMortgageOpen(false)
    setIsCreateSavingsOpen(false)
    setIsCreateCommodityOpen(false)
    // Reopen product selection
    setIsCreateProductOpen(true)
  }

  // Loan handlers
  const handleCreateLoan = async (data: any) => {
    setLoanData(data)
    setIsCreateLoanOpen(false)
    setIsProcessingOpen(true)

    try {
      // Create product with incomplete status
      const result = await productApi.createProduct({
        name: data?.productName || "Loan Product",
        description: data?.description || "Loan product",
        type: "Loan",
        appId: appId,
        status: 'complete', // Changed to complete - skip configuration for demo
        isActive: true // Make it active by default
      })

      if (result.success && result.data) {
        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsLoanSuccessOpen(true)
        }, 1000)
      } else {
        throw new Error(result.error || 'Failed to create product')
      }
    } catch (error) {
      console.error('Error creating loan product:', error)
      setIsProcessingOpen(false)
      toast.error(formatProductApiErrorMessage(error))
    }
  }

  const handleConfigureLoan = async (configData: any) => {
    setIsProcessingOpen(true)

    try {
      if (configuringProductId) {
        // Save configuration
        if (String(configuringProductStatus ?? "").toLowerCase() === "complete") {
          await productApi.saveProductConfigurationWithManage(configuringProductId, 'Loan', configData)
        } else {
          await productApi.saveProductConfiguration(configuringProductId, 'Loan', configData)
        }
        await productApi.updateProduct(configuringProductId, { status: 'complete' })

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setIsConfigureLoanOpen(false)
        setLoanConfigurePrefetch(null)
        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsLoanSuccessOpen(true)
          setConfiguringProductId(null)
          setConfiguringProductType(null)
          setConfiguringProductStatus(null)
        }, 1000)
      }
    } catch (error) {
      console.error('Error configuring loan product:', error)
      setIsProcessingOpen(false)
      throw error
    }
  }

  // Mortgage handlers
  const handleCreateMortgage = async (data: any) => {
    setMortgageData(data)
    setIsCreateMortgageOpen(false)
    setIsProcessingOpen(true)

    try {
      // Create product with incomplete status
      const result = await productApi.createProduct({
        name: data?.productName,
        description: data?.description,
        type: "Mortgage",
        appId: appId,
        status: 'complete',
        isActive: true
      })

      if (result.success && result.data) {
        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsMortgageSuccessOpen(true)
        }, 1000)
      } else {
        throw new Error(result.error || 'Failed to create product')
      }
    } catch (error) {
      console.error('Error creating mortgage product:', error)
      setIsProcessingOpen(false)
      toast.error(formatProductApiErrorMessage(error))
    }
  }

  const handleConfigureMortgage = async (configData: any) => {
    setIsProcessingOpen(true)

    try {
      if (configuringProductId) {
        // Save configuration and update status to complete
        if (String(configuringProductStatus ?? "").toLowerCase() === "complete") {
          await productApi.saveProductConfigurationWithManage(configuringProductId, 'Mortgage', configData)
        } else {
          await productApi.saveProductConfiguration(configuringProductId, 'Mortgage', configData)
        }
        await productApi.updateProduct(configuringProductId, { status: 'complete' })

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setIsConfigureMortgageOpen(false)
        setMortgageConfigurePrefetch(null)
        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsMortgageSuccessOpen(true)
          setConfiguringProductId(null)
          setConfiguringProductType(null)
          setConfiguringProductStatus(null)
        }, 1000)
      }
    } catch (error) {
      console.error('Error configuring mortgage product:', error)
      setIsProcessingOpen(false)
      throw error
    }
  }

  // Savings handlers
  const handleCreateSavings = async (data: any) => {
    setSavingsData(data)
    setIsCreateSavingsOpen(false)
    setIsProcessingOpen(true)

    try {
      // Create product with incomplete status
      const result = await productApi.createProduct({
        name: data?.productName || "Savings Product",
        description: data?.description || "Savings product",
        type: "Savings",
        appId: appId,
        status: 'complete',
        isActive: true
      })

      if (result.success && result.data) {
        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsSavingsSuccessOpen(true)
        }, 1000)
      } else {
        throw new Error(result.error || 'Failed to create product')
      }
    } catch (error) {
      console.error('Error creating savings product:', error)
      setIsProcessingOpen(false)
      toast.error(formatProductApiErrorMessage(error))
    }
  }

  const handleConfigureSavings = async (configData: any) => {
    setIsProcessingOpen(true)

    try {
      if (configuringProductId) {
        // Save configuration and update status to complete
        if (String(configuringProductStatus ?? "").toLowerCase() === "complete") {
          await productApi.saveProductConfigurationWithManage(configuringProductId, 'Savings', configData)
        } else {
          await productApi.saveProductConfiguration(configuringProductId, 'Savings', configData)
        }
        await productApi.updateProduct(configuringProductId, { status: 'complete' })

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setIsConfigureSavingsOpen(false)
        setSavingsConfigurePrefetch(null)
        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsSavingsSuccessOpen(true)
          setConfiguringProductId(null)
          setConfiguringProductType(null)
          setConfiguringProductStatus(null)
        }, 1000)
      }
    } catch (error) {
      console.error('Error configuring savings product:', error)
      setIsProcessingOpen(false)
      throw error
    }
  }

  // Commodity handlers
  const handleCreateCommodity = async (data: any) => {
    setCommodityData(data)
    setIsCreateCommodityOpen(false)
    setIsProcessingOpen(true)

    try {
      // Create product with incomplete status; use Investment type when selected
      const isInvestment = currentCreateType === "investment"
      const result = await productApi.createProduct({
        name: data?.productName || (isInvestment ? "Investment Product" : "Commodity Product"),
        description: data?.description || (isInvestment ? "Investment product" : "Commodity product"),
        type: isInvestment ? "Investment" : "Commodity",
        appId: appId,
        status: 'complete',
        isActive: true
      })

      if (result.success && result.data) {
        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsCommoditySuccessOpen(true)
        }, 1000)
      } else {
        throw new Error(result.error || 'Failed to create product')
      }
    } catch (error) {
      console.error('Error creating commodity product:', error)
      setIsProcessingOpen(false)
      toast.error(formatProductApiErrorMessage(error))
    }
  }

  const handleConfigureCommodity = async (configData: any) => {
    setIsProcessingOpen(true)

    try {
      if (configuringProductId) {
        // Save configuration and update status to complete.
        // Investment uses same form/flow but different productType on the backend.
        const configType = (configuringProductType || "").toLowerCase() === "investment" ? "Investment" : "Commodity"
        if (String(configuringProductStatus ?? "").toLowerCase() === "complete") {
          await productApi.saveProductConfigurationWithManage(configuringProductId, configType, configData)
        } else {
          await productApi.saveProductConfiguration(configuringProductId, configType, configData)
        }
        await productApi.updateProduct(configuringProductId, { status: 'complete' })

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setIsConfigureCommodityOpen(false)
        setCommodityConfigurePrefetch(null)
        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsCommoditySuccessOpen(true)
          setConfiguringProductId(null)
          setConfiguringProductType(null)
          setConfiguringProductStatus(null)
        }, 1000)
      }
    } catch (error) {
      console.error('Error configuring commodity product:', error)
      setIsProcessingOpen(false)
      throw error
    }
  }

  const handleConfigureProduct = async (productId: string, productType: string) => {
    const row = products.find((p) => p.id === productId)

    setPrefetchingProductId(productId)
    try {
      let dataStub: any = row
        ? { name: row.name, description: row.description ?? "", productId: row.id, ...row }
        : { productId }

      // Load full product payload/config for edit mode so the configure drawers can prefill fields.
      try {
        const [fullProduct, mappedConfig] = await Promise.all([
          productApi.getProductById(productId),
          productApi.getProductConfiguration(productId),
        ])
        dataStub = {
          ...dataStub,
          ...(fullProduct?.data ?? {}),
          ...(mappedConfig?.success ? mappedConfig.data : {}),
        }
      } catch {
        // Fall back to row data when detail/config fetch is unavailable.
      }

      const type = productType.toLowerCase()
      const effectiveStatus = String(dataStub?.status ?? row?.status ?? "").toLowerCase()
      if (type === "loan") {
        const prefetched = await prefetchLoanConfigureOptions()
        setLoanConfigurePrefetch(prefetched)
        setLoanData(dataStub)
        setConfiguringProductId(productId)
        setConfiguringProductType(productType)
        setConfiguringProductStatus(effectiveStatus)
        setIsConfigureLoanOpen(true)
      } else if (type === "mortgage") {
        const prefetched = await prefetchMortgageConfigureOptions()
        setMortgageConfigurePrefetch(prefetched)
        setMortgageData(dataStub)
        setConfiguringProductId(productId)
        setConfiguringProductType(productType)
        setConfiguringProductStatus(effectiveStatus)
        setIsConfigureMortgageOpen(true)
      } else if (type === "savings") {
        const prefetched = await prefetchSavingsConfigureOptions()
        setSavingsConfigurePrefetch(prefetched)
        setSavingsData(dataStub)
        setConfiguringProductId(productId)
        setConfiguringProductType(productType)
        setConfiguringProductStatus(effectiveStatus)
        setIsConfigureSavingsOpen(true)
      } else if (type === "commodity" || type === "investment") {
        const prefetched = await prefetchCommodityConfigureOptions(type === "investment")
        setCommodityConfigurePrefetch(prefetched)
        setCommodityData(dataStub)
        setConfiguringProductId(productId)
        setConfiguringProductType(productType)
        setConfiguringProductStatus(effectiveStatus)
        setIsConfigureCommodityOpen(true)
      }
    } catch (err) {
      console.error(err)
      toast.error(formatProductApiErrorMessage(err))
    } finally {
      setPrefetchingProductId(null)
    }
  }

  const handleProductClick = (productId: string, productType: string) => {
    router.push(`/dashboard/create-app/all-apps/${appId}/products/${productType.toLowerCase()}/${productId}`)
  }

  const handleEditProductFromMenu = (product: { id: string; type: string; status?: string }) => {
    void handleConfigureProduct(product.id, product.type)
  }

  const handleDeactivateProductFromMenu = async (productId: string) => {
    if (!confirm("Deactivate this product? Customers will no longer be able to use it until reactivated.")) return
    try {
      await productApi.updateProduct(productId, { isActive: false })
      await fetchProducts()
    } catch (err) {
      console.error(err)
      toast.error(formatProductApiErrorMessage(err))
    }
  }

  const handleActivateProductFromMenu = async (productId: string) => {
    if (!confirm("Activate this product? Customers will be able to use it again.")) return
    try {
      await productApi.updateProduct(productId, { isActive: true })
      await fetchProducts()
    } catch (err) {
      console.error(err)
      toast.error(formatProductApiErrorMessage(err))
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Create and manage your financial products</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Product Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setIsCreateProductOpen(true)}
            className="bg-[#9A813F] text-white hover:bg-[#8a7435]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Product
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-8">
        <div className="bg-[#F5F1E8] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your Product</h2>
          <p className="text-sm text-gray-600">Start by creating your financial product like loans, mortgages, savings or commodity trading.</p>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <TableSkeleton columnCount={7} rowCount={5} />
        ) : error ? (
          <div className="text-center py-12 px-4">
            <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={() => fetchProducts()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first financial product</p>
            <Button
              onClick={() => setIsCreateProductOpen(true)}
              className="bg-[#9A813F] text-white hover:bg-[#8a7435]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Product
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products match this type</h3>
            <p className="text-gray-600 mb-6">Try selecting "All types".</p>
            <Button
              onClick={() => setTypeFilter("all")}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Clear filter
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Product Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Product Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Customers</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Date Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Action</th>
                  <th className="w-12 py-3 px-2 text-right font-medium text-gray-900" aria-label="More actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  (() => {
                    const isInactive = product?.isActive === false || String(product?.status ?? "").toLowerCase() === "inactive"
                    return (
                  <tr
                    key={product.id}
                    onClick={() => handleProductClick(product.id, product.type)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                        {product.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${String(product.status).toLowerCase() === 'complete' && !isInactive
                        ? 'bg-green-100 text-green-800'
                        : isInactive
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {isInactive ? "inactive" : product.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{product.customers || '0'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleProductClick(product.id, product.type)
                          }}
                          className="text-[#9A813F] hover:underline text-sm font-medium"
                        >
                          Open Product
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                            aria-label="Product actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => handleEditProductFromMenu(product)}
                            disabled={prefetchingProductId === product.id}
                          >
                            <Pencil className="h-4 w-4" />
                            {prefetchingProductId === product.id
                              ? "Loading..."
                              : isInactive
                                ? "Edit product"
                                : String(product.status).toLowerCase() === "incomplete"
                                ? "Configure product"
                                : "Edit product"}
                          </DropdownMenuItem>
                          {isInactive ? (
                            <DropdownMenuItem
                              className="gap-2 text-green-700 focus:text-green-700"
                              onClick={() => void handleActivateProductFromMenu(product.id)}
                            >
                              <Power className="h-4 w-4" />
                              Activate product
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="gap-2 text-red-600 focus:text-red-600"
                              onClick={() => void handleDeactivateProductFromMenu(product.id)}
                            >
                              <Power className="h-4 w-4" />
                              Deactivate product
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                    )
                  })()
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawers */}
      <CreateProductDrawer
        isOpen={isCreateProductOpen}
        onClose={() => setIsCreateProductOpen(false)}
        onSelectProduct={handleProductSelect}
      />

      {/* Loan Drawers */}
      <CreateLoanDrawer
        isOpen={isCreateLoanOpen}
        onClose={() => setIsCreateLoanOpen(false)}
        onSubmit={handleCreateLoan}
        onBack={handleBackToProductSelection}
      />
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

      {/* Mortgage Drawers */}
      <CreateMortgageDrawer
        isOpen={isCreateMortgageOpen}
        onClose={() => setIsCreateMortgageOpen(false)}
        onSubmit={handleCreateMortgage}
        onBack={handleBackToProductSelection}
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

      {/* Savings Drawers */}
      <CreateSavingsDrawer
        isOpen={isCreateSavingsOpen}
        onClose={() => setIsCreateSavingsOpen(false)}
        onSubmit={handleCreateSavings}
        onBack={handleBackToProductSelection}
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

      {/* Commodity Drawers */}
      <CreateCommodityDrawer
        isOpen={isCreateCommodityOpen}
        onClose={() => setIsCreateCommodityOpen(false)}
        onSubmit={handleCreateCommodity}
        onBack={handleBackToProductSelection}
        variant={currentCreateType === "investment" ? "investment" : "commodity"}
      />
      <ConfigureCommodityDrawer
        isOpen={isConfigureCommodityOpen}
        onClose={() => {
          setIsConfigureCommodityOpen(false)
          setCommodityConfigurePrefetch(null)
        }}
        onSubmit={handleConfigureCommodity}
        commodityData={commodityData}
        variant={configuringProductType?.toLowerCase() === "investment" ? "investment" : "commodity"}
        prefetchedOptions={commodityConfigurePrefetch}
      />

      {/* Processing Drawer */}
      <ProcessingDrawer isOpen={isProcessingOpen} />

      {/* Success Drawers */}
      <LoanCreatedSuccessDrawer
        isOpen={isLoanSuccessOpen}
        onClose={() => {
          setIsLoanSuccessOpen(false)
          setLoanData(null)
        }}
      />
      <MortgageCreatedSuccessDrawer
        isOpen={isMortgageSuccessOpen}
        onClose={() => {
          setIsMortgageSuccessOpen(false)
          setMortgageData(null)
        }}
      />
      <SavingsCreatedSuccessDrawer
        isOpen={isSavingsSuccessOpen}
        onClose={() => {
          setIsSavingsSuccessOpen(false)
          setSavingsData(null)
        }}
      />
      <CommodityCreatedSuccessDrawer
        isOpen={isCommoditySuccessOpen}
        onClose={() => {
          setIsCommoditySuccessOpen(false)
          setCommodityData(null)
        }}
        variant={currentCreateType === "investment" ? "investment" : "commodity"}
      />
    </div>
  )
}
