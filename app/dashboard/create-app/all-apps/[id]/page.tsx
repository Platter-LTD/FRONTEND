"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { rowActionsColumn } from "@/components/ui/row-actions"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Package, Eye, X, Loader2 } from "lucide-react"
import { productApi } from "@/lib/services/product-api"
import { extractProductItems } from "@/lib/productOverview"
import { toast } from "sonner"

export default function UserAppDetailsPage() {
  const params = useParams()
  const appId = params.id as string
  const [activeTab, setActiveTab] = useState("general-info")
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const [overview, setOverview] = useState<{
    requestedAmount?: number
    approvedAmount?: number
    totalInterest?: number
  } | null>(null)

  const fmt = (n?: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(Number(n || 0))

  const fetchProducts = useCallback(async () => {
    if (!appId) return
    setProductsLoading(true)
    setProductsError(null)
    try {
      const data = await productApi.getProductsByAppId(appId)
      console.log(
        "[App overview] GET /api/products (proxied to account-ms-plata /api/v1/products) response:",
        data,
      )
      setProducts(extractProductItems(data))
    } catch (err) {
      console.error("[App overview] products fetch error:", err)
      setProducts([])
      setProductsError("Failed to load products. Please try again.")
    } finally {
      setProductsLoading(false)
    }
  }, [appId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    if (!appId) return
    setOverviewLoading(true)
    setOverviewError(null)
    productApi
      .getProductOverview(appId)
      .then((res) => {
        const h = (res as { data?: { headline?: Record<string, number> } })?.data?.headline || {}
        setOverview({
          requestedAmount: Number(h.requestedAmount || 0),
          approvedAmount: Number(h.approvedAmount || 0),
          totalInterest: Number(h.totalInterest || 0),
        })
      })
      .catch((e) => {
        setOverview(null)
        setOverviewError(e instanceof Error ? e.message : "Failed to load overview")
      })
      .finally(() => setOverviewLoading(false))
  }, [appId])

  const customers = [
    {
      name: "Grace Chidi",
      email: "youremail@email.com",
      phone: "+234701234567",
      dateTime: "Apr 12, 2025   09:32AM",
      status: "Successful",
    },
    {
      name: "Grace Chidi",
      email: "youremail@email.com",
      phone: "+234701234567",
      dateTime: "Apr 12, 2025   09:32AM",
      status: "Successful",
    },
    {
      name: "Grace Chidi",
      email: "youremail@email.com",
      phone: "+234701234567",
      dateTime: "Apr 12, 2025   09:32AM",
      status: "Successful",
    },
    {
      name: "Grace Chidi",
      email: "youremail@email.com",
      phone: "+234701234567",
      dateTime: "Apr 12, 2025   09:32AM",
      status: "Successful",
    },
    {
      name: "Grace Chidi",
      email: "youremail@email.com",
      phone: "+234701234567",
      dateTime: "Apr 12, 2025   09:32AM",
      status: "Successful",
    },
  ]

  const transactions = [
    {
      date: "12/09/2025",
      amount: "N10,000",
      status: "Successful",
      paymentMethod: "Visa 5134",
      transactionId: "3456788944",
      paymentLink: "Download",
    },
    {
      date: "12/09/2025",
      amount: "N10,000",
      status: "Failed",
      paymentMethod: "Bank transfer",
      transactionId: "3456788944",
      paymentLink: "Unavailable",
    },
    {
      date: "12/09/2025",
      amount: "N10,000",
      status: "Successful",
      paymentMethod: "Bank transfer",
      transactionId: "3456788944",
      paymentLink: "Unavailable",
    },
    {
      date: "12/09/2025",
      amount: "N10,000",
      status: "Pending",
      paymentMethod: "Mastercard 5031",
      transactionId: "3456788944",
      paymentLink: "Download",
    },
  ]


  type CustomerRow = (typeof customers)[number]
  const customerColumns: ColumnDef<CustomerRow, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-gray-900">{row.original.name}</span> },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "dateTime", header: "Date/time" },
    {
      id: "upload",
      header: "Upload",
      cell: () => (
        <Button variant="outline" size="sm" className="border-none bg-[#F5F1E8] text-[#8B7355] hover:bg-[#E5E1D8]">
          View upload
        </Button>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">{row.original.status}</span>
      ),
    },
    rowActionsColumn<CustomerRow>([{ label: "View upload", icon: Eye, onClick: () => {} }]),
  ]

  type TransactionRow = (typeof transactions)[number]
  const transactionColumns: ColumnDef<TransactionRow, unknown>[] = [
    { accessorKey: "date", header: "Date", cell: ({ row }) => <span className="text-gray-900">{row.original.date}</span> },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="text-gray-900">{row.original.amount}</span> },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row: { original: t } }) => (
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            t.status === "Successful" ? "bg-green-100 text-green-700" : t.status === "Failed" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
          }`}
        >
          {t.status}
        </span>
      ),
    },
    { accessorKey: "paymentMethod", header: "Payment Method" },
    { accessorKey: "transactionId", header: "Transaction ID" },
    {
      accessorKey: "paymentLink",
      header: "Payment link",
      cell: ({ row }) =>
        row.original.paymentLink === "Download" ? (
          <Button variant="outline" size="sm" className="border-gray-300 bg-transparent">
            Download
          </Button>
        ) : (
          <span className="text-sm text-gray-400">Unavailable</span>
        ),
    },
  ]

  return (
    <div className="flex-1 bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {activeTab === "general-info" ? "App Overview" : "Application Details"}
        </h1>
        <Button className="bg-[#8B7355] text-white hover:bg-[#7A6449] gap-2">
          <X size={16} />
          Suspend Apps
        </Button>
      </div>

      {/* Stats Card */}
      <div className="bg-[#2C3038] rounded-2xl p-8 mb-6">
        {overviewError ? <p className="text-red-300 text-sm mb-3">{overviewError}</p> : null}
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-gray-400 text-sm mb-2">Requested</p>
            <p className="text-white text-3xl font-semibold mb-1">{overviewLoading ? "Loading..." : fmt(overview?.requestedAmount)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">Approved</p>
            <p className="text-white text-3xl font-semibold mb-1">{overviewLoading ? "Loading..." : fmt(overview?.approvedAmount)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">Total interest</p>
            <p className="text-white text-3xl font-semibold mb-1">{overviewLoading ? "Loading..." : fmt(overview?.totalInterest)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b border-gray-200 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger
            value="general-info"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B7355] data-[state=active]:text-[#8B7355] data-[state=active]:bg-transparent px-6 py-3"
          >
            General Info
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B7355] data-[state=active]:text-[#8B7355] data-[state=active]:bg-transparent px-6 py-3"
          >
            Customers
          </TabsTrigger>
          <TabsTrigger
            value="new-submission"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B7355] data-[state=active]:text-[#8B7355] data-[state=active]:bg-transparent px-6 py-3"
          >
            New Submission
          </TabsTrigger>
          <TabsTrigger
            value="transaction"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B7355] data-[state=active]:text-[#8B7355] data-[state=active]:bg-transparent px-6 py-3"
          >
            Transaction
          </TabsTrigger>
        </TabsList>

        {/* General Info Tab */}
        <TabsContent value="general-info" className="mt-6">
          {productsLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading products…</span>
            </div>
          ) : productsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {productsError}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-gray-500">
              No products for this app yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const pid = product?.id as string | undefined
                const active = product?.isActive !== false && product?.status !== "inactive"
                return (
                  <div key={pid || product?.name} className="space-y-4">
                    <div className="bg-[#8B7355] rounded-xl p-6 flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                        <Package className="text-white shrink-0" size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-lg font-medium leading-tight break-words">
                            {product?.name || "Product"}
                          </p>
                          {product?.type ? (
                            <p className="text-white/80 text-sm mt-1">{String(product.type)}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/20">
                        <span className="text-white text-sm">Enabled</span>
                        <Switch
                          checked={active}
                          disabled={!pid || togglingProductId === pid}
                          onCheckedChange={async (checked) => {
                            if (!pid) return
                            setTogglingProductId(pid)
                            try {
                              await productApi.toggleProductStatus(appId, pid, checked)
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p?.id === pid ? { ...p, isActive: checked, status: checked ? "active" : "inactive" } : p,
                                ),
                              )
                            } catch (e) {
                              console.error("[App overview] toggle product:", e)
                              toast.error("Could not update product. Try again.")
                            } finally {
                              setTogglingProductId(null)
                            }
                          }}
                        />
                      </div>
                    </div>

                    {product?.description ? (
                      <p className="text-sm text-gray-600 line-clamp-3">{String(product.description)}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="mt-6">
          <DataTable tableId="app-customers" title="Customers" columns={customerColumns} data={customers} clientSearch download />
        </TabsContent>

        {/* New Submission Tab */}
        <TabsContent value="new-submission" className="mt-6">
          <DataTable tableId="app-new-submissions" title="New Submissions" columns={customerColumns} data={customers} clientSearch download />
        </TabsContent>

        {/* Transaction Tab */}
        <TabsContent value="transaction" className="mt-6">
          <DataTable tableId="app-transactions" title="Transactions" columns={transactionColumns} data={transactions} clientSearch download />
        </TabsContent>
      </Tabs>
    </div>
  )
}
