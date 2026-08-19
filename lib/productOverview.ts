/**
 * Product Overview types + helpers (Plata).
 * GET /api/v1/products/overview?appId=...
 * GET /api/v1/products?appId=...&status=...&type=...&page=...&limit=...
 */

export type ProductOverviewTabKey = "loan" | "mortgage" | "savings" | "investment" | "commodity"

export type OverviewTone = "success" | "muted" | "warning" | "danger" | "gold" | "info"

export type CatalogStatusFilter = "all" | "active" | "inactive" | "pendingConfiguration" | "featured"

export type CatalogOverviewTotals = {
  all?: number
  active?: number
  inactive?: number
  pendingConfiguration?: number
  featured?: number
}

export type CatalogOverviewByType = {
  loan?: number
  mortgage?: number
  savings?: number
  commodity?: number
  investment?: number
}

export type CatalogProductOverview = {
  totals?: CatalogOverviewTotals
  byType?: CatalogOverviewByType
}

export type CatalogProductItem = {
  id?: string
  name?: string
  type?: string
  status?: string
  isActive?: boolean
  configured?: boolean
  isFeatured?: boolean
  createdAt?: string
  updatedAt?: string
  appId?: string
  referenceNumber?: string
}

export type CatalogProductPagination = {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
}

export type CatalogProductList = {
  items?: CatalogProductItem[]
  pagination?: CatalogProductPagination
}

export type ListProductsParams = {
  appId: string
  status?: CatalogStatusFilter
  type?: ProductOverviewTabKey | "all"
  page?: number
  limit?: number
  search?: string
}

/** Legacy analytics compose types (older overview payloads). */
export type CategoryRow = {
  type: string
  configuredProductCount: number
  applicationCount: number
  customerCount: number
  capitalAmount: number
  issuedAmount: number
  repaymentAmount: number
  inventoryAmount: number
  salesAmount: number
}

export type ProductOverviewHeadline = {
  requestedAmount?: number
  approvedAmount?: number
  lendingApplicationsRequestedCount?: number
  lendingApplicationsApprovedCount?: number
  totalTransactions?: number
  totalSavings?: number
  totalInterest?: number
}

export type ProductOverviewData = {
  schemaVersion?: number
  generatedAt?: string
  appId?: string
  headline?: ProductOverviewHeadline
  byCategory?: CategoryRow[]
  totals?: CatalogOverviewTotals
  byType?: CatalogOverviewByType
}

/** Unwrap `{ data }` envelopes from the gateway, or return the payload itself. */
export function unwrapApiData<T>(res: unknown): T | null {
  if (!res || typeof res !== "object") return null
  const obj = res as Record<string, unknown>
  if ("data" in obj) {
    const inner = obj.data
    if (inner == null) return null
    return inner as T
  }
  return obj as T
}

export function unwrapCatalogOverview(res: unknown): CatalogProductOverview | null {
  return unwrapApiData<CatalogProductOverview>(res)
}

export function unwrapCatalogProductList(res: unknown): CatalogProductList {
  const inner = unwrapApiData<CatalogProductList | CatalogProductItem[] | Record<string, unknown>>(res)
  if (Array.isArray(inner)) return { items: inner, pagination: { page: 1, limit: inner.length, total: inner.length, totalPages: 1 } }
  if (inner && typeof inner === "object") {
    const obj = inner as Record<string, unknown>
    if (Array.isArray(obj.items)) {
      return {
        items: obj.items as CatalogProductItem[],
        pagination: (obj.pagination as CatalogProductPagination | undefined) ?? undefined,
      }
    }
  }
  return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
}

export function extractProductItems(res: unknown): CatalogProductItem[] {
  return unwrapCatalogProductList(res).items ?? []
}

export function countMajor(value: number | undefined | null) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0
  return n.toLocaleString("en-NG")
}

export function formatOverviewDate(iso?: string | null) {
  if (!iso || typeof iso !== "string") return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function titleCaseStatus(status?: string) {
  const s = String(status || "—").trim()
  if (!s) return "—"
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}

export function productStatusTone(status?: string, isActive?: boolean, isFeatured?: boolean): OverviewTone {
  if (isFeatured) return "gold"
  const s = String(status || "").toLowerCase()
  if (s === "active" && isActive !== false) return "success"
  if (s === "inactive" || isActive === false) return "muted"
  if (s === "draft" || s.includes("pending")) return "warning"
  return "muted"
}

/**
 * Map overview card / tab filters onto the list endpoint query.
 * Pending configuration uses `configured=false` (status=pendingConfiguration is rejected).
 * Featured uses `isFeatured=true` (status=featured is rejected).
 */
export function buildProductListSearchParams(params: ListProductsParams): URLSearchParams {
  const q = new URLSearchParams()
  q.set("appId", params.appId)
  q.set("page", String(Math.max(1, params.page ?? 1)))
  q.set("limit", String(Math.min(100, Math.max(1, params.limit ?? 20))))

  if (params.type && params.type !== "all") {
    q.set("type", params.type.toLowerCase())
  }

  if (params.status === "active" || params.status === "inactive") {
    q.set("status", params.status)
  } else if (params.status === "pendingConfiguration") {
    q.set("configured", "false")
  } else if (params.status === "featured") {
    q.set("isFeatured", "true")
  }

  const search = params.search?.trim()
  if (search) q.set("search", search)

  return q
}
