type OptionItem = {
  value?: string | number
  label?: string
}

type OptionResponse = {
  data?: OptionItem[]
}

type QueryParams = Record<string, string | number | boolean | undefined | null>

/**
 * Shared in-memory cache so Loan, Mortgage, and other configure flows reuse the same
 * backend option lists (e.g. loan-tenure) without duplicate fetches or diverging values.
 */
const resolvedOptionCache = new Map<string, string[]>()
const inflightOptionFetches = new Map<string, Promise<string[]>>()

function cacheGet(key: string): string[] | undefined {
  return resolvedOptionCache.get(key)
}

function cacheSet(key: string, value: string[]) {
  resolvedOptionCache.set(key, value)
}

/** For tests or forced refresh (optional). */
export function clearProductOptionsCache() {
  resolvedOptionCache.clear()
  inflightOptionFetches.clear()
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
        const list = (json?.data ?? []) as OptionItem[]
        const mapped =
          Array.isArray(list) && list.length
            ? list
                .map((x) => x.label || (x.value !== undefined && x.value !== null ? String(x.value) : ""))
                .filter((v): v is string => typeof v === "string" && v.length > 0)
            : []
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
        const url = buildUrl(`/api/v1/products/options/${encodeURIComponent(optionName)}`, query)
        const res = await fetch(url, { credentials: "include", cache: "no-store" })
        const json = (await res.json().catch(() => ({}))) as OptionResponse
        const list = (json?.data ?? []) as OptionItem[]
        const mapped =
          Array.isArray(list) && list.length
            ? list
                .map((x) => x.label || (x.value !== undefined && x.value !== null ? String(x.value) : ""))
                .filter((v): v is string => typeof v === "string" && v.length > 0)
            : []
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
