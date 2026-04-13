"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { productApi } from "@/lib/services/product-api"

interface DebugInfo {
  currentAppId?: string
  /** Products returned from GET /api/v1/products (full catalog). */
  catalogCount: number
  /** Products returned from GET /api/v1/products/app/:appId when appId is set. */
  appScopedCount: number
  allAppIds: string[]
  sampleProducts: Array<{
    id?: string
    name?: string
    type?: string
    appId?: string
    isActive?: boolean
    status?: string
  }>
  apiStatus: "checking" | "success" | "partial" | "error"
  catalogError?: string
  appError?: string
  timestamp: string
}

interface ProductDebugPanelProps {
  appId?: string
  location: "platter" | "spring"
}

/** Normalize various backend / proxy response shapes to a product array. */
function extractProductsArray(payload: unknown): any[] {
  if (payload == null) return []
  if (Array.isArray(payload)) return payload
  if (typeof payload !== "object") return []
  const p = payload as Record<string, unknown>
  if (Array.isArray(p.data)) return p.data as any[]
  const inner = p.data
  if (inner && typeof inner === "object") {
    const d = inner as Record<string, unknown>
    if (Array.isArray(d.products)) return d.products as any[]
    if (Array.isArray(d.items)) return d.items as any[]
    if (Array.isArray(d.records)) return d.records as any[]
  }
  if (Array.isArray(p.products)) return p.products as any[]
  return []
}

function pickAppId(p: any): string | undefined {
  if (!p || typeof p !== "object") return undefined
  const v = p.appId ?? p.app_id ?? p.applicationId ?? p.application_id
  return typeof v === "string" && v.trim() ? v.trim() : undefined
}

/** Upstream often forbids GET /api/v1/products for merchant JWTs while app-scoped routes still work. */
function isExpectedCatalogRestriction(message: string | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes("merchant api") ||
    m.includes("authentication required") ||
    m.includes("forbidden") ||
    m.includes("not authorized") ||
    m.includes("403")
  )
}

export function ProductDebugPanel({ appId, location }: ProductDebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchDebugInfo = useCallback(async () => {
    setLoading(true)
    const timestamp = new Date().toISOString()

    let catalog: any[] = []
    let catalogError: string | undefined
    let appScoped: any[] = []
    let appError: string | undefined

    const catalogPromise = productApi.getAllProducts().then(
      (res) => {
        catalog = extractProductsArray(res)
      },
      (err: unknown) => {
        catalogError = err instanceof Error ? err.message : String(err)
      },
    )

    const appPromise =
      appId != null && appId !== ""
        ? productApi.getProductsByAppId(appId).then(
            (res) => {
              appScoped = extractProductsArray(res)
            },
            (err: unknown) => {
              appError = err instanceof Error ? err.message : String(err)
            },
          )
        : Promise.resolve()

    await Promise.all([catalogPromise, appPromise])

    const primaryList = catalog.length > 0 ? catalog : appScoped
    const uniqueAppIds = [...new Set(primaryList.map(pickAppId).filter(Boolean))] as string[]

    const sampleProducts = primaryList.slice(0, 5).map((p: any) => ({
      id: p.id ?? p._id,
      name: p.name,
      type: p.type,
      appId: pickAppId(p),
      isActive: p.isActive ?? p.active,
      status: p.status,
    }))

    const catalogOk = !catalogError
    const appOk = !appError
    const catalogRestricted = Boolean(
      catalogError && appOk && appId && isExpectedCatalogRestriction(catalogError),
    )

    let apiStatus: DebugInfo["apiStatus"] = "success"
    if (!appId) {
      apiStatus = catalogOk ? "success" : "error"
    } else if (!appOk) {
      apiStatus = "error"
    } else if (catalogOk) {
      apiStatus = "success"
    } else if (catalogRestricted) {
      apiStatus = "success"
    } else {
      apiStatus = "partial"
    }

    setDebugInfo({
      currentAppId: appId,
      catalogCount: catalog.length,
      appScopedCount: appScoped.length,
      allAppIds: uniqueAppIds,
      sampleProducts,
      apiStatus,
      catalogError: catalogRestricted ? undefined : catalogError,
      appError,
      timestamp,
    })
    setLoading(false)
  }, [appId])

  useEffect(() => {
    if (expanded) {
      void fetchDebugInfo()
    }
  }, [expanded, fetchDebugInfo])

  if (!expanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setExpanded(true)}
          variant="outline"
          className="border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Debug Products
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(100vw-2rem,520px)]">
      <Card className="border-2 border-yellow-300 shadow-lg">
        <CardHeader className="bg-yellow-50">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600" />
                Product Debug Panel
              </CardTitle>
              <CardDescription className="mt-1">
                Location: <Badge variant="outline">{location === "platter" ? "PLATA" : "Spring App"}</Badge>
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="ghost" onClick={() => void fetchDebugInfo()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-h-[600px] overflow-y-auto pt-4">
          {loading && !debugInfo ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : debugInfo ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {debugInfo.apiStatus === "success" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : debugInfo.apiStatus === "partial" ? (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  API Status:{" "}
                  {debugInfo.apiStatus === "success"
                    ? "OK"
                    : debugInfo.apiStatus === "partial"
                      ? "Partial"
                      : "Error"}
                </span>
              </div>

              {(debugInfo.catalogError || debugInfo.appError) && (
                <div className="space-y-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {debugInfo.catalogError ? (
                    <p>
                      <strong>Catalog:</strong> {debugInfo.catalogError}
                    </p>
                  ) : null}
                  {appId && debugInfo.appError ? (
                    <p>
                      <strong>App-scoped:</strong> {debugInfo.appError}
                    </p>
                  ) : null}
                </div>
              )}

              <div className="rounded border border-blue-200 bg-blue-50 p-3">
                <div className="mb-1 text-sm font-medium text-blue-900">Current AppId</div>
                <div className="break-all font-mono text-xs text-blue-700">{debugInfo.currentAppId || "Not set"}</div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-1 text-xs text-gray-600">Full catalog</div>
                  <div className="text-2xl font-bold text-gray-900">{debugInfo.catalogCount}</div>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-1 text-xs text-gray-600">Active for this app</div>
                  <div className="text-2xl font-bold text-gray-900">{appId ? debugInfo.appScopedCount : "—"}</div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-gray-900">
                  Distinct AppIds in merged sample ({debugInfo.allAppIds.length})
                </div>
                <div className="max-h-32 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3">
                  {debugInfo.allAppIds.length > 0 ? (
                    <div className="space-y-1">
                      {debugInfo.allAppIds.map((id) => (
                        <div
                          key={id}
                          className={`rounded p-1 font-mono text-xs ${
                            id === debugInfo.currentAppId ? "bg-green-100 font-bold text-green-800" : "text-gray-600"
                          }`}
                        >
                          {id === debugInfo.currentAppId ? "→ " : ""}
                          {id}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs italic text-gray-500">No appIds found in product payloads.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-gray-900">Sample products (first 5)</div>
                <div className="max-h-48 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-3">
                  {debugInfo.sampleProducts.length > 0 ? (
                    <div className="space-y-2">
                      {debugInfo.sampleProducts.map((product, idx) => (
                        <div
                          key={`${product.id ?? idx}`}
                          className={`rounded border p-2 text-xs ${
                            product.appId === debugInfo.currentAppId ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
                          }`}
                        >
                          <div className="font-medium text-gray-900">{product.name ?? "(unnamed)"}</div>
                          <div className="mt-1 text-gray-600">
                            Type: {product.type ?? "—"} | Status: {product.status ?? "—"}
                          </div>
                          <div className="mt-1 break-all font-mono text-gray-500">AppId: {product.appId ?? "—"}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
                              {product.isActive ? "Active" : "Inactive / unknown"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs italic text-gray-500">No product rows returned from either endpoint.</div>
                  )}
                </div>
              </div>

              <div className="border-t pt-2 text-center text-xs text-gray-500">
                Last updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
              </div>

              {appId && debugInfo.appScopedCount === 0 && debugInfo.catalogCount > 0 && !debugInfo.appError && (
                <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm">
                  <strong className="text-yellow-900">No activations for this app</strong>
                  <p className="mt-1 text-yellow-800">
                    The catalog lists products, but none are returned for this appId from the app-scoped endpoint.
                    Enable products for this app or confirm the appId.
                  </p>
                </div>
              )}

              {debugInfo.catalogCount === 0 && debugInfo.appScopedCount === 0 && !debugInfo.catalogError && !debugInfo.appError && (
                <div className="rounded border border-orange-200 bg-orange-50 p-3 text-sm">
                  <strong className="text-orange-900">No products in responses</strong>
                  <p className="mt-1 text-orange-800">Both endpoints returned empty lists (or unparsed bodies).</p>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
