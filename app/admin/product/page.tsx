"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { rowActionsColumn } from "@/components/ui/row-actions"
import { adminProductsApi, AdminProduct } from "@/lib/services/adminService"
import SuspendProductDrawer from "@/components/drawers/suspend-product-drawer"
import DeactivateConfirmationDrawer from "@/components/drawers/deactivate-confirmation-drawer"
import DeactivationSuccessDrawer from "@/components/drawers/deactivation-success-drawer"
import { toast } from "sonner"

const TABS = [
  { id: "all", label: "All products" },
  { id: "loan", label: "Loans" },
  { id: "savings", label: "Savings" },
  { id: "mortgage", label: "Mortgage" },
  { id: "commodity", label: "Commodity" },
]

export default function AdminProductPage() {
  const [activeTab, setActiveTab] = useState("all")
  const router = useRouter()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)

  const [isSuspendDrawerOpen, setIsSuspendDrawerOpen] = useState(false)
  const [isConfirmationDrawerOpen, setIsConfirmationDrawerOpen] = useState(false)
  const [isSuccessDrawerOpen, setIsSuccessDrawerOpen] = useState(false)

  const fetchProducts = async () => {
    setLoading(true)
    const type = activeTab !== "all" ? activeTab.charAt(0).toUpperCase() + activeTab.slice(1) : undefined
    const res = await adminProductsApi.getAllProducts(type)
    if (res.success && res.data) {
      setProducts(res.data)
    } else {
      setProducts([])
      if (res.error) console.warn("[AdminProducts] API unavailable:", res.error)
    }
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [activeTab])


  const handleDeactivate = () => {
    setIsSuspendDrawerOpen(false)
    setIsConfirmationDrawerOpen(true)
  }

  const handleConfirmDeactivation = async () => {
    if (selectedProductId) {
      const res = await adminProductsApi.updateProduct(selectedProductId, { isActive: false })
      if (res.success) {
        setProducts(prev => prev.map(p =>
          p.id === selectedProductId ? { ...p, isActive: false } : p
        ))
        toast.success("Product suspended")
      } else {
        toast.error("Failed to suspend product")
      }
    }
    setIsConfirmationDrawerOpen(false)
    setIsSuccessDrawerOpen(true)
  }

  const handleCloseAll = () => {
    setIsSuspendDrawerOpen(false)
    setIsConfirmationDrawerOpen(false)
    setIsSuccessDrawerOpen(false)
    setSelectedProductId(null)
  }

  const formatDate = (d?: string) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const columns: ColumnDef<AdminProduct, unknown>[] = [
    { accessorKey: "name", header: "Product Name", cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span> },
    { accessorKey: "appId", header: "App ID", cell: ({ row }) => <span className="font-mono text-gray-500">{row.original.appId || "—"}</span> },
    { accessorKey: "type", header: "Type", cell: ({ row }) => <span className="capitalize">{row.original.type || "—"}</span> },
    {
      id: "dateCreated",
      header: "Date Created",
      accessorFn: (p) => p.createdAt || p.dateCreated,
      cell: ({ row }) => formatDate(row.original.createdAt || row.original.dateCreated),
    },
    {
      id: "reference",
      header: "Reference",
      accessorFn: (p) => p.referenceNumber || p.productKey || p.id.slice(0, 12),
      cell: ({ getValue }) => <span className="font-mono text-gray-500">{String(getValue())}</span>,
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (p) => (p.isActive ? "Active" : "Inactive"),
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            row.original.isActive ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
          }`}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    rowActionsColumn<AdminProduct>([
      {
        label: "Suspend product",
        icon: X,
        destructive: true,
        onClick: (product) => {
          setSelectedProductId(product.id)
          setIsSuspendDrawerOpen(true)
        },
      },
    ]),
  ]

  return (
    <div className="flex-1 bg-white">
      <div className="border-b border-gray-200 px-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === tab.id ? "text-[#4169E1]" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4169E1]" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Button
              onClick={() => setIsSuspendDrawerOpen(true)}
              className="bg-[#4169E1] text-white hover:bg-[#3557c7] gap-2"
              disabled={!selectedProductId}
            >
              <X size={16} />
              Suspend Product
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <DataTable
          tableId="admin-products"
          title="Products"
          columns={columns}
          data={products}
          isLoading={loading}
          onRefresh={fetchProducts}
          clientSearch
          searchPlaceholder="Search by name, ID, or app..."
          download
          resetPageSignal={activeTab}
          empty="No products found."
          rowDetails={{ drawer: true }}
          onRowClick={(product) => setSelectedProductId(product.id === selectedProductId ? null : product.id)}
          rowClassName={(product) => (selectedProductId === product.id ? "bg-primary/5" : undefined)}
        />
      </div>

      <SuspendProductDrawer isOpen={isSuspendDrawerOpen} onClose={handleCloseAll} onDeactivate={handleDeactivate} />
      <DeactivateConfirmationDrawer
        isOpen={isConfirmationDrawerOpen}
        onClose={handleCloseAll}
        onConfirm={handleConfirmDeactivation}
      />
      <DeactivationSuccessDrawer isOpen={isSuccessDrawerOpen} onClose={handleCloseAll} />
    </div>
  )
}
