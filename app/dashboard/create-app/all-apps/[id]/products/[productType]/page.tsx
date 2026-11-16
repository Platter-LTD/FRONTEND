"use client"

import { ArrowLeft } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState, useCallback, useMemo } from "react"
import { formatProductApiErrorMessage } from "@/lib/formatProductApiErrorMessage"
import { toast } from "sonner"
import { mergeProductsForAppByType, productRowId } from "@/lib/mergeAppCatalogProducts"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { Switch } from "@/components/ui/switch"
import { useAppProducts, useProductActions, useProductList } from "@/hooks/queries/products"
import { extractProductItems, withProductItemsAsData, type ListProductsParams } from "@/lib/productOverview"

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
  const canonical = productTypeParamToCanonical(productType)
  const productActions = useProductActions()

  // App activations + the type's catalog, both cached; merged into the rows shown.
  const appProductsQuery = useAppProducts(appId)
  const catalogQuery = useProductList(
    appId
      ? {
          appId,
          type: canonical && canonical.toLowerCase() !== "all" ? (canonical.toLowerCase() as ListProductsParams["type"]) : undefined,
          page: 1,
          limit: 100,
        }
      : null,
  )
  const loading = appProductsQuery.isLoading
  const loadError = appProductsQuery.error ? appProductsQuery.error.message || "Failed to load app products" : null

  const appRows = useMemo(
    () => (appProductsQuery.data ? extractProductItems(appProductsQuery.data) : []),
    [appProductsQuery.data],
  )

  // Activation state from the server, overlaid with toggles made on this page.
  const [activationOverrides, setActivations] = useState<{ [key: string]: boolean }>({})
  const activations = useMemo(() => {
    const map: { [key: string]: boolean } = {}
    appRows.forEach((row: any) => {
      const pid = row.productId ?? row.id ?? row._id
      if (!pid) return
      const active = row.isActive !== false && row.isActive !== "inactive"
      for (const key of [pid, row.id, row._id, row.productId]) if (key) map[String(key)] = active
    })
    return { ...map, ...activationOverrides }
  }, [appRows, activationOverrides])
  const [pendingToggles, setPendingToggles] = useState<{ [key: string]: boolean }>({})

  const products: any[] = useMemo(() => {
    if (appProductsQuery.error) return []
    let catalogRows: unknown[] | null = null
    const body = catalogQuery.data as { success?: boolean } | undefined
    if (body && !(typeof body === "object" && !Array.isArray(body) && body.success === false)) {
      const extracted = extractProductItems(withProductItemsAsData(body as Record<string, unknown>))
      catalogRows = extracted.length ? extracted : null
    }
    return mergeProductsForAppByType(appRows, catalogRows, appId, canonical) as any[]
  }, [appRows, catalogQuery.data, appProductsQuery.error, appId, canonical])

  const fetchData = useCallback(async () => {
    await Promise.all([appProductsQuery.refetch(), catalogQuery.refetch()])
  }, [appProductsQuery, catalogQuery])

  const getProductTypeDisplayName = () => {
    return productType.charAt(0).toUpperCase() + productType.slice(1)
  }

  const handleToggleActivation = async (toggleId: string, rowId: string, currentState: boolean) => {
    try {
      const newState = !currentState
      setPendingToggles((prev) => ({ ...prev, [toggleId]: true }))

      await productActions.toggleAppProductActivation(appId, toggleId, newState)

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
