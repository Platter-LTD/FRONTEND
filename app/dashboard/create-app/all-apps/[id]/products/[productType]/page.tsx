"use client"

import { ArrowLeft } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { productApi } from "@/lib/services/product-api"
import { extractProductItems } from "@/lib/productOverview"
import { formatProductApiErrorMessage } from "@/lib/formatProductApiErrorMessage"
import { toast } from "sonner"
import { mergeProductsForAppByType, productRowId } from "@/lib/mergeAppCatalogProducts"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { Switch } from "@/components/ui/switch"

/** URL segment `loan` → Product MS discriminator `LOAN` (docs: canonical `type` values). */
function productTypeParamToCanonical(param: string): string {
  const map: Record<string, string> = {
    loan: "LOAN",
    mortgage: "MORTGAGE",
    savings: "SAVINGS",
    commodity: "COMMODITY",
    investment: "INVESTMENT",
  }
  const k = param.toLowerCase()
  return map[k] || param.toUpperCase()
}

export default function ProductTypeListPage() {
  const params = useParams()
  const router = useRouter()
  const productType = params.productType as string
  const appId = params.id as string
  const [products, setProducts] = useState<any[]>([])
  const [activations, setActivations] = useState<{ [key: string]: boolean }>({})
  const [pendingToggles, setPendingToggles] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)

      const canonical = productTypeParamToCanonical(productType)

      const [appOutcome, catalogOutcome] = await Promise.allSettled([
        productApi.getProductsByAppId(appId),
        productApi.getAllProducts({ appId, type: canonical, page: 1, limit: 100 }),
      ])

      if (appOutcome.status === "rejected") {
        const msg =
          appOutcome.reason instanceof Error ? appOutcome.reason.message : "Failed to load app products"
        setProducts([])
        setActivations({})
        setLoadError(msg)
        return
      }

      const activationsData = appOutcome.value
      const appRows = extractProductItems(activationsData)

      const activationMap: { [key: string]: boolean } = {}
      appRows.forEach((row: any) => {
        const pid = row.productId ?? row.id ?? row._id
        if (pid) {
          const active = row.isActive !== false && row.isActive !== "inactive"
          activationMap[String(pid)] = active
          if (row.id) activationMap[String(row.id)] = active
          if (row._id) activationMap[String(row._id)] = active
          if (row.productId) activationMap[String(row.productId)] = active
        }
      })
      setActivations(activationMap)

      let catalogRows: unknown[] | null = null
      if (catalogOutcome.status === "fulfilled") {
        const catalogRes = catalogOutcome.value as { success?: boolean; data?: unknown; error?: string } | unknown[]
        const body = catalogRes as { success?: boolean; data?: unknown; error?: string }
        if (!(body && typeof body === "object" && !Array.isArray(body) && body.success === false)) {
          const extracted = extractProductItems(catalogRes)
          catalogRows = extracted.length ? extracted : null
        }
      }

      const merged = mergeProductsForAppByType(appRows, catalogRows, appId, canonical)
      setProducts(merged as any[])
    } catch (error) {
      console.error("Error fetching data:", error)
      setProducts([])
      setLoadError(error instanceof Error ? error.message : "Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [appId, productType])

  useEffect(() => {
    if (appId && productType) {
      void fetchData()
    }
  }, [appId, productType, fetchData])

  const getProductTypeDisplayName = () => {
    return productType.charAt(0).toUpperCase() + productType.slice(1)
  }

  const handleToggleActivation = async (toggleId: string, rowId: string, currentState: boolean) => {
    try {
      const newState = !currentState
      setPendingToggles((prev) => ({ ...prev, [toggleId]: true }))

      await productApi.toggleAppProductActivation(appId, toggleId, newState)

      setActivations((prev) => ({
        ...prev,
        [toggleId]: newState,
        [rowId]: newState,
      }))
    } catch (error) {
      console.error("Error toggling product activation:", error)
      toast.error(formatProductApiErrorMessage(error))
    } finally {
      setPendingToggles((prev) => {
        const next = { ...prev }
        delete next[toggleId]
        return next
      })
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const activationOf = (product: any) => {
    const id = productRowId(product)
    const toggleId = String(product?.productId ?? id)
    return { id, toggleId, isActive: Boolean(activations[toggleId] ?? activations[id] ?? false), isPending: Boolean(pendingToggles[toggleId]) }
  }

  const columns: ColumnDef<any, unknown>[] = [
    {
      id: "name",
      header: "Product Name",
      accessorFn: (p) => p.name || p.productName,
      cell: ({ getValue }) => <span className="font-medium text-gray-900">{String(getValue() ?? "")}</span>,
    },
    { id: "description", header: "Description", accessorFn: (p) => p.description || "No description" },
    { id: "dateCreated", header: "Date Created", accessorFn: (p) => formatDate(p.createdAt || p.dateCreated) },
    {
      id: "status",
      header: "Status",
      accessorFn: (p) => (activationOf(p).isActive ? "Active" : "Inactive"),
      cell: ({ row }) => {
        const { isActive } = activationOf(row.original)
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        )
      },
    },
    {
      id: "activate",
      header: "Activate for App",
      cell: ({ row }) => {
        const { id, toggleId, isActive, isPending } = activationOf(row.original)
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={isActive}
              disabled={isPending}
              onCheckedChange={() => {
                if (!isPending && toggleId) void handleToggleActivation(toggleId, id, isActive)
              }}
              aria-label={isActive ? "Deactivate for app" : "Activate for app"}
              className="data-[state=checked]:bg-[#9A813F]"
            />
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/dashboard/create-app/all-apps/${appId}/products/overview`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-medium">All {getProductTypeDisplayName()} Products</h2>
          </div>
          <p className="ml-7 text-sm text-gray-600">
            {products.length} {getProductTypeDisplayName().toLowerCase()} product(s) for this app
          </p>
        </div>
      </div>

      <DataTable
        tableId={`app-products-${productType}`}
        title={`${getProductTypeDisplayName()} Products`}
        columns={columns}
        data={products}
        isLoading={loading}
        isError={!!loadError}
        error={loadError}
        onRefresh={() => void fetchData()}
        clientSearch
        download
        rowDetails={{ drawer: true }}
        onRowClick={(product) => {
          const id = productRowId(product)
          if (id) router.push(`/dashboard/create-app/all-apps/${appId}/products/${productType.toLowerCase()}/${encodeURIComponent(id)}`)
        }}
        empty={
          <div className="px-8 py-14 text-center">
            <h3 className="mb-2 text-lg font-medium text-gray-900">No {getProductTypeDisplayName()} Products Available</h3>
            <p className="text-gray-600">
              There are no {productType} products in the catalog for this workspace yet. Create one from the Products page, then
              return here to enable it for this app.
            </p>
          </div>
        }
      />
    </div>
  )
}
