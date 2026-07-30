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

/**
 * Shared in-memory cache so Loan, Mortgage, and other configure flows reuse the same
 * backend option lists (e.g. loan-tenure) without duplicate fetches or diverging values.
 */
const resolvedOptionCache = new Map<string, string[]>()
const resolvedProductOptionCache = new Map<string, ProductOption[]>()
const inflightOptionFetches = new Map<string, Promise<string[]>>()
const inflightProductOptionFetches = new Map<string, Promise<ProductOption[]>>()

function cacheGet(key: string): string[] | undefined {
  return resolvedOptionCache.get(key)
}

function cacheSet(key: string, value: string[]) {
  resolvedOptionCache.set(key, value)
}

/** For tests or forced refresh (optional). */
export function clearProductOptionsCache() {
  resolvedOptionCache.clear()
  resolvedProductOptionCache.clear()
  inflightOptionFetches.clear()
  inflightProductOptionFetches.clear()
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
 * Fetches an option list from frontend proxy route:
 * /api/configurations/options/:optionName
 */
export async function fetchOptionLabels(optionName: string, fallback: string[] = []): Promise<string[]> {
  const key = `cfg:${optionName}`
  const hit = cacheGet(key)
  if (hit !== undefined) return hit

  let p = inflightOptionFetches.get(key)
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(`/api/configurations/options/${encodeURIComponent(optionName)}`, {
          credentials: "include",
          cache: "no-store",
        })
        const json = (await res.json().catch(() => ({}))) as OptionResponse
        const mapped = mapOptionItems((json?.data ?? []) as OptionItem[]).map((o) => o.label)
        const result = mapped.length ? mapped : fallback
        cacheSet(key, result)
        return result
      } catch {
        cacheSet(key, fallback)
        return fallback
      } finally {
        inflightOptionFetches.delete(key)
      }
    })()
    inflightOptionFetches.set(key, p)
  }
  return p
}

/**
 * Fetches value+label options from:
 * /api/v1/products/options/:optionName
 * Use for fields that must submit `value` and display `label` (e.g. trigger-duration).
 */
export async function fetchProductOptions(
  optionName: string,
  fallback: ProductOption[] = [],
  query?: QueryParams,
): Promise<ProductOption[]> {
  const key = `prod-opts:${optionName}:${JSON.stringify(query ?? {})}`
  const hit = resolvedProductOptionCache.get(key)
  if (hit !== undefined) return hit

  let p = inflightProductOptionFetches.get(key)
  if (!p) {
    p = (async () => {
      try {
        const url = buildUrl(`/api/v1/products/options/${encodeURIComponent(optionName)}`, query)
        const res = await fetch(url, { credentials: "include", cache: "no-store" })
        const json = (await res.json().catch(() => ({}))) as OptionResponse
        const mapped = mapOptionItems((json?.data ?? []) as OptionItem[])
        const result = mapped.length ? mapped : fallback
        resolvedProductOptionCache.set(key, result)
        return result
      } catch {
        resolvedProductOptionCache.set(key, fallback)
        return fallback
      } finally {
        inflightProductOptionFetches.delete(key)
      }
    })()
    inflightProductOptionFetches.set(key, p)
  }
  return p
}

/**
 * Fetches an option list from frontend proxy route:
 * /api/v1/products/options/:optionName
 */
export async function fetchProductOptionLabels(
  optionName: string,
  fallback: string[] = [],
  query?: QueryParams,
): Promise<string[]> {
  const key = `prod:${optionName}:${JSON.stringify(query ?? {})}`
  const hit = cacheGet(key)
  if (hit !== undefined) return hit

  let p = inflightOptionFetches.get(key)
  if (!p) {
    p = (async () => {
      try {
        const opts = await fetchProductOptions(
          optionName,
          fallback.map((label) => ({ value: label, label })),
          query,
        )
        const result = opts.map((o) => o.label)
        cacheSet(key, result.length ? result : fallback)
        return result.length ? result : fallback
      } catch {
        cacheSet(key, fallback)
        return fallback
      } finally {
        inflightOptionFetches.delete(key)
      }
    })()
    inflightOptionFetches.set(key, p)
  }
  return p
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
