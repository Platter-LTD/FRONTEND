"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { IoIosCopy } from "react-icons/io"
import { Button } from "@/components/ui/button"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { formatProductApiErrorMessage } from "@/lib/formatProductApiErrorMessage"
import { toast } from "sonner"
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
import { useProductActions } from "@/hooks/queries/products"

export function ProductsTab() {
  const productActions = useProductActions()
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false)
  
  // Loan states
  const [isCreateLoanOpen, setIsCreateLoanOpen] = useState(false)
  const [isConfigureLoanOpen, setIsConfigureLoanOpen] = useState(false)
  const [isLoanSuccessOpen, setIsLoanSuccessOpen] = useState(false)
  const [loanData, setLoanData] = useState<any>(null)
  
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
  
  // Commodity states
  const [isCreateCommodityOpen, setIsCreateCommodityOpen] = useState(false)
  const [isConfigureCommodityOpen, setIsConfigureCommodityOpen] = useState(false)
  const [isCommoditySuccessOpen, setIsCommoditySuccessOpen] = useState(false)
  const [commodityData, setCommodityData] = useState<any>(null)
  
  // Processing state
  const [isProcessingOpen, setIsProcessingOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [currentProductType, setCurrentProductType] = useState<string>("")

  const [products, setProducts] = useState([
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      allUsers: "grace.yo@spring.td",
      userPhone: "+234703671453B",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      allUsers: "grace.yo@spring.td",
      userPhone: "+234703671453B",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      allUsers: "grace.yo@spring.td",
      userPhone: "+234703671453B",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      allUsers: "grace.yo@spring.td",
      userPhone: "+234703671453B",
    },
  ])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleProductSelect = (productType: string) => {
    setCurrentProductType(productType)
    setIsCreateProductOpen(false)
    if (productType === "loan") {
      setIsCreateLoanOpen(true)
    } else if (productType === "mortgage") {
      setIsCreateMortgageOpen(true)
    } else if (productType === "savings") {
      setIsCreateSavingsOpen(true)
    } else if (productType === "commodity") {
      setIsCreateCommodityOpen(true)
    } else if (productType === "investment") {
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
      const result = await productActions.createProduct({
        name: data?.productName || "Loan Product",
        description: data?.description || "Loan product",
        type: "Loan",
        appId: data?.appId || "default-app",
        status: 'incomplete'
      })

      if (result.success && result.data) {
        setLoanData({ ...data, productId: result.data.id })
        setIsProcessingOpen(false)
        setIsConfigureLoanOpen(true)
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
      const productId = loanData?.productId
      if (productId) {
        // Save configuration and update status to complete
        await productActions.saveProductConfiguration(productId, 'Loan', configData)
        await productActions.updateProduct(productId, { status: 'complete' })
      }

      setIsConfigureLoanOpen(false)
      setTimeout(() => {
        setIsProcessingOpen(false)
        setIsLoanSuccessOpen(true)
      }, 1000)
    } catch (error) {
      console.error('Error configuring loan product:', error)
      setIsProcessingOpen(false)
      toast.error(formatProductApiErrorMessage(error))
    }
  }

  // Mortgage handlers
  const handleCreateMortgage = async (data: any) => {
    setMortgageData(data)
    setIsCreateMortgageOpen(false)
    setIsProcessingOpen(true)

    try {
      // Create product with incomplete status
      const result = await productActions.createProduct({
        name: data?.productName || "Mortgage Product",
        description: data?.description || "Mortgage product",
        type: "Mortgage",
        appId: data?.appId || "default-app",
        status: 'incomplete'
      })

      if (result.success && result.data) {
        setMortgageData({ ...data, productId: result.data.id })
        setIsProcessingOpen(false)
        setIsConfigureMortgageOpen(true)
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
      const productId = mortgageData?.productId
      if (productId) {
        // Save configuration and update status to complete
        await productActions.saveProductConfiguration(productId, 'Mortgage', configData)
        await productActions.updateProduct(productId, { status: 'complete' })
      }

      setIsConfigureMortgageOpen(false)
      setTimeout(() => {
        setIsProcessingOpen(false)
        setIsMortgageSuccessOpen(true)
      }, 1000)
    } catch (error) {
      console.error('Error configuring mortgage product:', error)
      setIsProcessingOpen(false)
      toast.error(formatProductApiErrorMessage(error))
    }
  }

  // Savings handlers
  const handleCreateSavings = (data: any) => {
    setSavingsData(data)
    setIsCreateSavingsOpen(false)
    setIsConfigureSavingsOpen(true)
  }

  const handleConfigureSavings = (configData: any) => {
    setIsConfigureSavingsOpen(false)
    setIsProcessingOpen(true)

    // Simulate processing
    setTimeout(() => {
      setIsProcessingOpen(false)
      setIsSavingsSuccessOpen(true)
    }, 2000)
  }

  // Commodity handlers
  const handleCreateCommodity = (data: any) => {
    setCommodityData(data)
    setIsCreateCommodityOpen(false)
    setIsConfigureCommodityOpen(true)
  }

  const handleConfigureCommodity = (configData: any) => {
    setIsConfigureCommodityOpen(false)
    setIsProcessingOpen(true)

    // Simulate processing
    setTimeout(() => {
      setIsProcessingOpen(false)
      setIsCommoditySuccessOpen(true)
    }, 2000)
  }

  const handleProductClick = (product: any) => {
    setSelectedProduct(product)
  }


  type ProductRow = (typeof products)[number]
  const copyCell = (value: string) => (
    <div className="flex items-center gap-2">
      {value}
      <button
        type="button"
        aria-label="Copy"
        onClick={(e) => {
          e.stopPropagation()
          handleCopy(value)
        }}
        className="hover:text-[#9A813F]"
      >
        <IoIosCopy size={16} />
      </button>
    </div>
  )
  const productColumns: ColumnDef<ProductRow, unknown>[] = [
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="text-gray-900">{row.original.amount}</span> },
    { accessorKey: "ref", header: "Ref", cell: ({ row }) => copyCell(row.original.ref) },
    { accessorKey: "timestamp", header: "Timestamp" },
    { accessorKey: "fee", header: "Fee" },
    { accessorKey: "product", header: "Product" },
    { accessorKey: "metaRef", header: "Meta_Ref", cell: ({ row }) => copyCell(row.original.metaRef) },
    { accessorKey: "allUsers", header: "All users" },
    { accessorKey: "userPhone", header: "User Phone" },
  ]
  return (
    <>
      <DataTable
        tableId="products-tab"
        title="All Product"
        columns={productColumns}
        data={products}
        clientSearch
        download
        rowDetails={{ drawer: true }}
        onRowClick={(product) => handleProductClick(product)}
        action={
          <Button onClick={() => setIsCreateProductOpen(true)} className="gap-2 bg-black text-white hover:bg-gray-800">
            <Plus size={16} />
            create product
          </Button>
        }
      />

      {/* Drawers */}
      <CreateProductDrawer
        isOpen={isCreateProductOpen}
        onClose={() => setIsCreateProductOpen(false)}
        onSelectProduct={handleProductSelect}
      />
      <CreateLoanDrawer
        isOpen={isCreateLoanOpen}
        onClose={() => setIsCreateLoanOpen(false)}
        onSubmit={handleCreateLoan}
        onBack={handleBackToProductSelection}
      />
      <CreateMortgageDrawer
        isOpen={isCreateMortgageOpen}
        onClose={() => setIsCreateMortgageOpen(false)}
        onSubmit={handleCreateMortgage}
        onBack={handleBackToProductSelection}
      />
      <CreateSavingsDrawer
        isOpen={isCreateSavingsOpen}
        onClose={() => setIsCreateSavingsOpen(false)}
        onSubmit={handleCreateSavings}
        onBack={handleBackToProductSelection}
      />
      <CreateCommodityDrawer
        isOpen={isCreateCommodityOpen}
        onClose={() => setIsCreateCommodityOpen(false)}
        onSubmit={handleCreateCommodity}
        onBack={handleBackToProductSelection}
        variant={currentProductType === "investment" ? "investment" : "commodity"}
      />
      
      {/* Configuration Drawers */}
      <ConfigureLoanDrawer
        isOpen={isConfigureLoanOpen}
        onClose={() => setIsConfigureLoanOpen(false)}
        onSubmit={handleConfigureLoan}
        loanData={loanData}
      />
      <ConfigureMortgageDrawer
        isOpen={isConfigureMortgageOpen}
        onClose={() => setIsConfigureMortgageOpen(false)}
        onSubmit={handleConfigureMortgage}
        mortgageData={mortgageData}
      />
      <ConfigureSavingsDrawer
        isOpen={isConfigureSavingsOpen}
        onClose={() => setIsConfigureSavingsOpen(false)}
        onSubmit={handleConfigureSavings}
        savingsData={savingsData}
      />
      <ConfigureCommodityDrawer
        isOpen={isConfigureCommodityOpen}
        onClose={() => setIsConfigureCommodityOpen(false)}
        onSubmit={handleConfigureCommodity}
        commodityData={commodityData}
        variant={currentProductType === "investment" ? "investment" : "commodity"}
      />
      
      {/* Processing Drawer */}
      <ProcessingDrawer isOpen={isProcessingOpen} />
      
      {/* Success Drawers */}
      <LoanCreatedSuccessDrawer isOpen={isLoanSuccessOpen} onClose={() => setIsLoanSuccessOpen(false)} />
      <MortgageCreatedSuccessDrawer isOpen={isMortgageSuccessOpen} onClose={() => setIsMortgageSuccessOpen(false)} />
      <SavingsCreatedSuccessDrawer isOpen={isSavingsSuccessOpen} onClose={() => setIsSavingsSuccessOpen(false)} />
      <CommodityCreatedSuccessDrawer
        isOpen={isCommoditySuccessOpen}
        onClose={() => {
          setIsCommoditySuccessOpen(false)
          setCurrentProductType("")
        }}
        variant={currentProductType === "investment" ? "investment" : "commodity"}
      />
    </>
  )
}
