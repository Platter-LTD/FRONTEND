"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Package, ExternalLink, AlertCircle, RefreshCw } from "lucide-react"
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

export default function ProductsPage() {
  const params = useParams()
  const router = useRouter()
  const appId = params.id as string
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Loan states
  const [isCreateLoanOpen, setIsCreateLoanOpen] = useState(false)
  const [isConfigureLoanOpen, setIsConfigureLoanOpen] = useState(false)
  const [isLoanSuccessOpen, setIsLoanSuccessOpen] = useState(false)
  const [loanData, setLoanData] = useState<any>(null)
  const [configuringProductId, setConfiguringProductId] = useState<string | null>(null)
  const [configuringProductType, setConfiguringProductType] = useState<string | null>(null)

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
      alert('Failed to create loan product. Please try again.')
    }
  }

  const handleConfigureLoan = async (configData: any) => {
    setIsConfigureLoanOpen(false)
    setIsProcessingOpen(true)

    try {
      if (configuringProductId) {
        // Save configuration
        await productApi.saveProductConfiguration(configuringProductId, 'Loan', configData)
        await productApi.updateProduct(configuringProductId, { status: 'complete' })

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsLoanSuccessOpen(true)
          setConfiguringProductId(null)
          setConfiguringProductType(null)
        }, 1000)
      }
    } catch (error) {
      console.error('Error configuring loan product:', error)
      setIsProcessingOpen(false)
      alert('Failed to configure loan product. Please try again.')
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
      alert('Failed to create mortgage product. Please try again.')
    }
  }

  const handleConfigureMortgage = async (configData: any) => {
    setIsConfigureMortgageOpen(false)
    setIsProcessingOpen(true)

    try {
      if (configuringProductId) {
        // Save configuration and update status to complete
        await productApi.saveProductConfiguration(configuringProductId, 'Mortgage', configData)
        await productApi.updateProduct(configuringProductId, { status: 'complete' })

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsMortgageSuccessOpen(true)
          setConfiguringProductId(null)
          setConfiguringProductType(null)
        }, 1000)
      }
    } catch (error) {
      console.error('Error configuring mortgage product:', error)
      setIsProcessingOpen(false)
      alert('Failed to configure mortgage product. Please try again.')
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
      alert('Failed to create savings product. Please try again.')
    }
  }

  const handleConfigureSavings = async (configData: any) => {
    setIsConfigureSavingsOpen(false)
    setIsProcessingOpen(true)

    try {
      if (configuringProductId) {
        // Save configuration and update status to complete
        await productApi.saveProductConfiguration(configuringProductId, 'Savings', configData)
        await productApi.updateProduct(configuringProductId, { status: 'complete' })

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsSavingsSuccessOpen(true)
          setConfiguringProductId(null)
          setConfiguringProductType(null)
        }, 1000)
      }
    } catch (error) {
      console.error('Error configuring savings product:', error)
      setIsProcessingOpen(false)
      alert('Failed to configure savings product. Please try again.')
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
      alert('Failed to create commodity product. Please try again.')
    }
  }

  const handleConfigureCommodity = async (configData: any) => {
    setIsConfigureCommodityOpen(false)
    setIsProcessingOpen(true)

    try {
      if (configuringProductId) {
        // Save configuration and update status to complete.
        // Investment uses same form/flow but different productType on the backend.
        const configType = (configuringProductType || "").toLowerCase() === "investment" ? "Investment" : "Commodity"
        await productApi.saveProductConfiguration(configuringProductId, configType, configData)
        await productApi.updateProduct(configuringProductId, { status: 'complete' })

        // Refetch products to ensure we have the latest data
        const productsData = await productApi.getProductsByAppId(appId)
        if (productsData.success && productsData.data) {
          setProducts(productsData.data)
        }

        setTimeout(() => {
          setIsProcessingOpen(false)
          setIsCommoditySuccessOpen(true)
          setConfiguringProductId(null)
          setConfiguringProductType(null)
        }, 1000)
      }
    } catch (error) {
      console.error('Error configuring commodity product:', error)
      setIsProcessingOpen(false)
      alert('Failed to configure commodity product. Please try again.')
    }
  }

  const handleConfigureProduct = (productId: string, productType: string) => {
    setConfiguringProductId(productId)
    setConfiguringProductType(productType)

    const type = productType.toLowerCase()
    if (type === 'loan') {
      setIsConfigureLoanOpen(true)
    } else if (type === 'mortgage') {
      setIsConfigureMortgageOpen(true)
    } else if (type === 'savings') {
      setIsConfigureSavingsOpen(true)
    } else if (type === 'commodity') {
      setIsConfigureCommodityOpen(true)
    } else if (type === 'investment') {
      setIsConfigureCommodityOpen(true)
    }
  }

  const handleProductClick = (productId: string, productType: string) => {
    router.push(`/dashboard/create-app/all-apps/${appId}/products/${productType.toLowerCase()}/${productId}`)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Create and manage your financial products</p>
        </div>
        <Button
          onClick={() => setIsCreateProductOpen(true)}
          className="bg-[#9A813F] text-white hover:bg-[#8a7435]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Product
        </Button>
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
          <TableSkeleton columnCount={6} rowCount={5} />
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
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
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${product.status === 'complete'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{product.customers || '0'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleProductClick(product.id, product.type)
                          }}
                          className="text-[#9A813F] hover:underline text-sm font-medium"
                        >
                          Open Product
                        </button>
                        {product.status === 'incomplete' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleConfigureProduct(product.id, product.type)
                            }}
                            className="bg-[#9A813F] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#8a7435]"
                          >
                            Configure
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
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
        onClose={() => setIsConfigureLoanOpen(false)}
        onSubmit={handleConfigureLoan}
        loanData={loanData}
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
        onClose={() => setIsConfigureMortgageOpen(false)}
        onSubmit={handleConfigureMortgage}
        mortgageData={mortgageData}
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
        onClose={() => setIsConfigureSavingsOpen(false)}
        onSubmit={handleConfigureSavings}
        savingsData={savingsData}
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
        onClose={() => setIsConfigureCommodityOpen(false)}
        onSubmit={handleConfigureCommodity}
        commodityData={commodityData}
        variant={configuringProductType?.toLowerCase() === "investment" ? "investment" : "commodity"}
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
