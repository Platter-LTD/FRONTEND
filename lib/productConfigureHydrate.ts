/**
 * Edit-mode helpers: turn Product MS nested/enum values into form strings,
 * and merge a PUT payload so untouched fields keep their saved values.
 */

export function pickRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

export function unwrapProductDocument(raw: unknown): Record<string, unknown> {
  const root = pickRecord(raw)
  const nested = pickRecord(root.product)
  if (
    Object.keys(nested).length &&
    (nested.about || nested.structure || nested.feesAndCharges || nested.requirements || nested.id || nested._id)
  ) {
    return { ...root, ...nested }
  }
  return root
}

export function pickProductTab(product: Record<string, unknown> | null | undefined, key: string): Record<string, unknown> {
  if (!product) return {}
  const nests = [
    product,
    pickRecord(product.configuration),
    pickRecord(product.calculatedConfig),
    pickRecord(product.config),
    pickRecord(product.product),
  ]
  let out: Record<string, unknown> = {}
  for (const nest of nests) {
    const tab = pickRecord(nest[key])
    if (Object.keys(tab).length) {
      out = { ...out, ...tab }
    }
  }
  return out
}

export function displayStringFromApi(raw: unknown): string {
  if (raw == null || raw === "") return ""
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw)
  if (typeof raw === "boolean") return raw ? "true" : "false"
  if (typeof raw === "string") {
    const s = raw.trim()
    if (!s || s === "[object Object]") return ""
    return s
  }
  if (Array.isArray(raw)) {
    return raw.map(displayStringFromApi).filter(Boolean).join(", ")
  }
  const row = pickRecord(raw)
  const unit = displayStringFromApi(row.unit)
  const value = row.value
  if (value != null && typeof value !== "object" && unit) {
    return `${displayStringFromApi(value)} ${unit}`.trim()
  }
  const candidates = [row.label, row.display, row.displayValue, row.name, row.tenure, row.duration, value, row.months]
  for (const c of candidates) {
    const parsed = displayStringFromApi(c)
    if (parsed) return parsed
  }
  return ""
}

export function interestRateFromApi(raw: unknown): string {
  if (raw == null || raw === "") return ""
  if (typeof raw === "number" && Number.isFinite(raw)) return `${raw}%`
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const row = pickRecord(raw)
    const inner = interestRateFromApi(row.value ?? row.rate ?? row.interestRate)
    if (inner) return inner.includes("%") ? inner : `${inner}%`
  }
  const s = displayStringFromApi(raw)
  if (!s) return ""
  if (s.includes("%")) return s
  const n = Number(s.replace(/%/g, "").replace(/,/g, ""))
  if (Number.isFinite(n)) return `${n}%`
  return s
}

export function filledOrExisting(formValue: string, ...fallbacks: unknown[]): string {
  const form = String(formValue ?? "").trim()
  if (form && form !== "[object Object]") return formValue
  for (const fallback of fallbacks) {
    const parsed = displayStringFromApi(fallback)
    if (parsed) return parsed
  }
  return formValue
}

export function previewUrlFromProduct(product: Record<string, unknown> | null | undefined): string {
  if (!product) return ""
  const about = pickProductTab(product, "about")
  const candidates = [
    about.previewAssetUrl,
    product.previewAssetUrl,
    pickRecord(product.previewImage).url,
    pickRecord(about.previewImage).url,
    about.image,
    product.image,
  ]
  for (const c of candidates) {
    const s = displayStringFromApi(c)
    if (s) return s
  }
  return ""
}

/** Overlay `next` onto `existing`, keeping saved values when the form sent empty/missing data. */
export function mergePreferExisting<T>(existing: T, next: T): T {
  if (next == null) return existing
  if (existing == null) return next
  if (Array.isArray(next)) {
    if (next.length === 0 && Array.isArray(existing) && (existing as unknown[]).length) return existing
    return next
  }
  if (typeof next !== "object" || typeof existing !== "object") return next

  const base = existing as Record<string, unknown>
  const overlay = next as Record<string, unknown>
  const out: Record<string, unknown> = { ...base }

  for (const [key, value] of Object.entries(overlay)) {
    if (value === undefined || value === null) continue
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (!trimmed || trimmed === "[object Object]") continue
      out[key] = value
      continue
    }
    if (Array.isArray(value)) {
      if (value.length === 0 && Array.isArray(base[key]) && (base[key] as unknown[]).length) continue
      out[key] = value
      continue
    }
    if (typeof value === "object") {
      out[key] = mergePreferExisting(base[key], value)
      continue
    }
    out[key] = value
  }

  return out as T
}
