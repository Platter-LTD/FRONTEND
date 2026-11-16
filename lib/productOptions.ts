import { getQueryClient } from "@/lib/query/queryClient"
import { gatewayFetch } from "@/lib/gatewayFetch"
type OptionItem = {
  value?: string | number
  label?: string
}

type OptionResponse = {
  data?: OptionItem[]
}

export type ProductOption = {
  value: string
  label: string
}

type QueryParams = Record<string, string | number | boolean | undefined | null>

/** Option lists are effectively static: keep them for the whole session (React Query cache). */
const OPTIONS_STALE_MS = 30 * 60_000

/** React Query key for one option list (+ optional query params). */
export function productOptionsQueryKey(optionName: string, query?: QueryParams) {
  return ["product-options", optionName, query ?? {}] as const
}

/** For tests or forced refresh (optional). */
export function clearProductOptionsCache() {
  getQueryClient().removeQueries({ queryKey: ["product-options"] })
}

const buildUrl = (basePath: string, query?: QueryParams) => {
  if (!query) return basePath
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  })
  const queryString = params.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}

function mapOptionItems(list: OptionItem[]): ProductOption[] {
  if (!Array.isArray(list) || !list.length) return []
  return list
    .map((x) => {
      const value =
        x.value !== undefined && x.value !== null && String(x.value).trim() !== ""
          ? String(x.value)
          : typeof x.label === "string" && x.label.trim()
            ? x.label.trim()
            : ""
      const label =
        typeof x.label === "string" && x.label.trim()
          ? x.label.trim()
          : value
      return value ? { value, label } : null
    })
    .filter((x): x is ProductOption => Boolean(x))
}

/**
 * GET an option list from the gateway: /api/v1/products/options/:name, falling back to
 * /api/v1/configurations/options/:name when product-ms does not expose that option (404 / route not found).
 * Mirrors the logic of the old Next.js proxy route.
 */
async function fetchOptionsJson(optionName: string, query?: QueryParams): Promise<OptionResponse> {
  const slug = encodeURIComponent(optionName)
  const primary = await gatewayFetch(buildUrl(`/api/v1/products/options/${slug}`, query), { cache: "no-store" })
  const primaryJson = (await primary.json().catch(() => ({}))) as OptionResponse & { success?: boolean; error?: unknown; message?: unknown }
  if (primary.ok && primaryJson?.success !== false && Array.isArray(primaryJson?.data)) return primaryJson

  const msg = String(primaryJson?.error ?? primaryJson?.message ?? "").toLowerCase()
  const notOnProducts =
    primary.status === 404 ||
    msg.includes("route not found") ||
    msg.includes("endpoint not found") ||
    msg.includes("path not found") ||
    msg === "not found"
  if (!notOnProducts) return primaryJson

  const fallback = await gatewayFetch(buildUrl(`/api/v1/configurations/options/${slug}`, query), { cache: "no-store" })
  const fallbackJson = (await fallback.json().catch(() => ({}))) as OptionResponse
  return fallback.ok && Array.isArray(fallbackJson?.data) ? fallbackJson : ({ data: [] } as unknown as OptionResponse)
}

/** Uncached: mapped `{ value, label }` rows for an option list (throws on network failure). */
export async function loadProductOptions(optionName: string, query?: QueryParams): Promise<ProductOption[]> {
  const json = await fetchOptionsJson(optionName, query)
  return mapOptionItems((json?.data ?? []) as OptionItem[])
}

/** Cached (React Query) option rows; [] on failure so callers can apply their own fallback. */
async function cachedProductOptions(optionName: string, query?: QueryParams): Promise<ProductOption[]> {
  try {
    return await getQueryClient().fetchQuery({
      queryKey: productOptionsQueryKey(optionName, query),
      queryFn: () => loadProductOptions(optionName, query),
      staleTime: OPTIONS_STALE_MS,
    })
  } catch {
    return []
  }
}

/**
 * Option labels from /api/v1/products/options/:optionName (falls back to
 * /configurations/options/:optionName). Returns `fallback` when the list is empty or fails.
 */
export async function fetchOptionLabels(optionName: string, fallback: string[] = []): Promise<string[]> {
  const labels = (await cachedProductOptions(optionName)).map((o) => o.label)
  return labels.length ? labels : fallback
}

/**
 * `{ value, label }` options from /api/v1/products/options/:optionName.
 * Use for fields that must submit `value` and display `label` (e.g. trigger-duration).
 */
export async function fetchProductOptions(
  optionName: string,
  fallback: ProductOption[] = [],
  query?: QueryParams,
): Promise<ProductOption[]> {
  const options = await cachedProductOptions(optionName, query)
  return options.length ? options : fallback
}

/** Labels for /api/v1/products/options/:optionName with optional query params. */
export async function fetchProductOptionLabels(
  optionName: string,
  fallback: string[] = [],
  query?: QueryParams,
): Promise<string[]> {
  const labels = (await cachedProductOptions(optionName, query)).map((o) => o.label)
  return labels.length ? labels : fallback
}

export const DEFAULT_TRIGGER_DURATION_OPTIONS: ProductOption[] = [
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
]
