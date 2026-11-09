"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Package, ExternalLink, Pencil, Power } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TableEmptyState } from "@/components/ui/table-states"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { rowActionsColumn, type RowAction } from "@/components/ui/row-actions"
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
import { extractProductItems } from "@/lib/productOverview"
import { formatProductApiErrorMessage } from "@/lib/formatProductApiErrorMessage"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { usePermissions } from "@/hooks/usePermissions"

export default function ProductsPage() {
  const params = useParams()
  const router = useRouter()
  const appId = params.id as string
  const { actions } = usePermissions()
  const canCreateProduct = actions.createProduct
  const canEditProduct = actions.editProduct
  const canPublishProduct = actions.publishProduct
  const canArchiveProduct = actions.archiveProduct
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
      setProducts(extractProductItems(data))
      setError(null)
    } catch (err) {
      console.error("Error fetching products:", err)
      setProducts([])
      setError("Failed to load products. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [appId])

  const saveConfiguredProduct = useCallback(
    async (productId: string, productType: string, configData: Record<string, unknown>) => {
      // PUT /:id is first save and later edits (complete products included).
      // PUT /:id/manage is only a status-gated alias and is not required.
      await productApi.saveProductConfiguration(productId, productType, {
        ...configData,
        status: "complete",
      })
    },
    [],
  )

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
        setProducts(extractProductItems(productsData))

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
        await saveConfiguredProduct(configuringProductId, "Loan", configData)

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        setProducts(extractProductItems(productsData))

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
        setProducts(extractProductItems(productsData))

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
        await saveConfiguredProduct(configuringProductId, "Mortgage", configData)

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        setProducts(extractProductItems(productsData))

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
        setProducts(extractProductItems(productsData))

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
        await saveConfiguredProduct(configuringProductId, "Savings", configData)

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        setProducts(extractProductItems(productsData))

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
        setProducts(extractProductItems(productsData))

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
        const configType = (configuringProductType || "").toLowerCase() === "investment" ? "Investment" : "Commodity"
        await saveConfiguredProduct(configuringProductId, configType, configData)

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        setProducts(extractProductItems(productsData))

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

      // Load full Product MS document (about / structure / requirements / feesAndCharges) for edit mode.
      // Do not merge getProductConfiguration() here — it returns a legacy "configuration view" shape that
      // overwrites tab fields and breaks Configure* drawer prefills.
      try {
        const fullProduct = await productApi.getProductById(productId)
        if (fullProduct?.data && typeof fullProduct.data === "object") {
          dataStub = { ...dataStub, ...fullProduct.data }
        }
      } catch {
        // Fall back to row data when detail fetch is unavailable.
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


  const isProductInactive = (product: any) =>
    product?.isActive === false || String(product?.status ?? "").toLowerCase() === "inactive"

  const productColumns: ColumnDef<any, unknown>[] = [
    { accessorKey: "name", header: "Product Name", cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span> },
    {
      accessorKey: "type",
      header: "Product Type",
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 capitalize">{row.original.type}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (p) => (isProductInactive(p) ? "inactive" : p.status),
      cell: ({ row: { original: product } }) => {
        const isInactive = isProductInactive(product)
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
              String(product.status).toLowerCase() === "complete" && !isInactive
                ? "bg-green-100 text-green-800"
                : isInactive
                  ? "bg-gray-100 text-gray-700"
                  : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {isInactive ? "inactive" : product.status}
          </span>
        )
      },
    },
    { id: "customers", header: "Customers", accessorFn: (p) => p.customers || "0" },
    {
      id: "createdAt",
      header: "Date Created",
      accessorFn: (p) => (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"),
    },
    rowActionsColumn<any>((product) => {
      const isInactive = isProductInactive(product)
      const actions: RowAction<any>[] = [
        { label: "Open product", icon: ExternalLink, onClick: (p) => handleProductClick(p.id, p.type) },
      ]
      if (canEditProduct) {
        actions.push({
          label:
            prefetchingProductId === product.id
              ? "Loading..."
              : !isInactive && String(product.status).toLowerCase() === "incomplete"
                ? "Configure product"
                : "Edit product",
          icon: Pencil,
          disabled: (p) => prefetchingProductId === p.id,
          onClick: (p) => handleEditProductFromMenu(p),
        })
      }
      if (isInactive && canPublishProduct) {
        actions.push({ label: "Activate product", icon: Power, onClick: (p) => void handleActivateProductFromMenu(p.id) })
      }
      if (!isInactive && canArchiveProduct) {
        actions.push({ label: "Deactivate product", icon: Power, destructive: true, onClick: (p) => void handleDeactivateProductFromMenu(p.id) })
      }
      return actions
    }),
  ]
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Create and manage your financial products</p>
        </div>
        <div className="flex items-center gap-4">

          {canCreateProduct ? (
          <Button
            onClick={() => setIsCreateProductOpen(true)}
            className="bg-[#9A813F] text-white hover:bg-[#8a7435]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Product
          </Button>
          ) : null}
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-8">
        <div className="bg-[#F5F1E8] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your Product</h2>
          <p className="text-sm text-gray-600">Start by creating your financial product like loans, mortgages, savings or commodity trading.</p>
        </div>
      </div>

      <DataTable
        tableId="app-products"
        title="Products"
        columns={productColumns}
        data={filteredProducts}
        isLoading={loading}
        isError={!!error}
        error={error}
        onRefresh={() => fetchProducts()}
        clientSearch
        download
        resetPageSignal={typeFilter}
        rowDetails={{
          drawer: true,
          title: (product) => product.name || "Product details",
          // The list row is a summary; fetch the full product (configuration, fees, requirements…).
          load: (product) => productApi.getProductById(String(product.id)),
        }}
        onRowClick={(product) => handleProductClick(product.id, product.type)}
        filters={{
          content: (
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
          ),
          activeCount: typeFilter === "all" ? 0 : 1,
          onClear: typeFilter === "all" ? undefined : () => setTypeFilter("all"),
        }}
        empty={
          products.length > 0 ? (
            <TableEmptyState title="No products match this type" description="Try selecting “All types”." />
          ) : (
            <div className="px-8 py-14 text-center">
              <Plus className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">No products yet</h3>
              <p className="mb-6 text-gray-600">
                {canCreateProduct ? "Get started by creating your first financial product" : "No products are available to view yet."}
              </p>
              {canCreateProduct ? (
                <Button onClick={() => setIsCreateProductOpen(true)} className="bg-[#9A813F] text-white hover:bg-[#8a7435]">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Product
                </Button>
              ) : null}
            </div>
          )
        }
      />

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
