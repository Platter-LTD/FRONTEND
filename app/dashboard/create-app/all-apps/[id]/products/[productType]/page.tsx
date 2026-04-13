"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { productApi } from "@/lib/services/product-api"
import { mergeProductsForAppByType, productRowId } from "@/lib/mergeAppCatalogProducts"
import { TableSkeleton } from "@/components/ui/table-skeleton"

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
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)

      const canonical = productTypeParamToCanonical(productType)

      const [appOutcome, catalogOutcome] = await Promise.allSettled([
        productApi.getProductsByAppId(appId),
        productApi.getAllProducts(),
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
      const appRows = Array.isArray(activationsData?.data) ? activationsData.data : []

      const activationMap: { [key: string]: boolean } = {}
      appRows.forEach((row: any) => {
        const pid = row.productId ?? row.id
        if (pid) {
          activationMap[String(pid)] = row.isActive !== false && row.isActive !== "inactive"
        }
      })
      setActivations(activationMap)

      let catalogRows: unknown[] | null = null
      if (catalogOutcome.status === "fulfilled") {
        const catalogRes = catalogOutcome.value as { success?: boolean; data?: unknown; error?: string } | unknown[]
        const body = catalogRes as { success?: boolean; data?: unknown; error?: string }
        if (!(body && typeof body === "object" && !Array.isArray(body) && body.success === false)) {
          const extracted = Array.isArray((catalogRes as { data?: unknown })?.data)
            ? (catalogRes as { data: unknown[] }).data
            : Array.isArray(catalogRes)
              ? (catalogRes as unknown[])
              : []
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

  const handleToggleActivation = async (productId: string, currentState: boolean) => {
    try {
      const newState = !currentState
      await productApi.toggleAppProductActivation(appId, productId, newState)

      setActivations((prev) => ({
        ...prev,
        [productId]: newState,
      }))
    } catch (error) {
      console.error("Error toggling product activation:", error)
      alert("Failed to toggle product activation. Please try again.")
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

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

      {loading ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <TableSkeleton columnCount={5} rowCount={6} />
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="mb-4 text-gray-800">Could not load products</p>
          <p className="mb-6 text-sm text-gray-600">{loadError}</p>
          <Button type="button" variant="outline" onClick={() => void fetchData()}>
            Try again
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <h3 className="mb-2 text-lg font-medium text-gray-900">No {getProductTypeDisplayName()} Products Available</h3>
          <p className="text-gray-600">
            There are no {productType} products in the catalog for this workspace yet. Create one from the Products
            page, then return here to enable it for this app.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-[#F5F5F5]">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Product Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date Created</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Activate for App</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const id = productRowId(product)
                const isActive = activations[id] || false
                return (
                  <tr
                    key={id || product.name}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      if (id) {
                        router.push(
                          `/dashboard/create-app/all-apps/${appId}/products/${productType.toLowerCase()}/${encodeURIComponent(id)}`,
                        )
                      }
                    }}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name || product.productName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.description || "No description"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(product.createdAt || product.dateCreated)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (id) void handleToggleActivation(id, isActive)
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isActive ? "bg-[#9A813F]" : "bg-gray-200"
                        }`}
                        aria-label={isActive ? "Deactivate for app" : "Activate for app"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
