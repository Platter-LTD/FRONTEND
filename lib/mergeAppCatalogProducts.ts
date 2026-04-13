/**
 * Build the product list that should match Product Overview "configured" semantics:
 * union of app-scoped rows (GET …/products/app/:appId) and catalog rows (GET …/products)
 * for the same appId + canonical type, deduped by product id.
 */

export function pickProductAppId(product: unknown): string | undefined {
  if (!product || typeof product !== "object") return undefined
  const p = product as Record<string, unknown>
  const v = p.appId ?? p.app_id ?? p.applicationId ?? p.application_id
  return typeof v === "string" && v.trim() ? v.trim() : undefined
}

export function productRowId(product: unknown): string {
  if (!product || typeof product !== "object") return ""
  const p = product as Record<string, unknown>
  const id = p.id ?? p._id
  return id != null ? String(id) : ""
}

function typeMatches(product: unknown, canonicalUpper: string): boolean {
  if (!product || typeof product !== "object") return false
  const t = (product as Record<string, unknown>).type
  return String(t ?? "").toUpperCase() === canonicalUpper
}

/** Catalog rows must declare this appId to be merged (avoid pulling unrelated global products). */
function catalogRowBelongsToApp(product: unknown, appId: string): boolean {
  const aid = pickProductAppId(product)
  if (!aid) return false
  return String(aid) === String(appId)
}

/**
 * Merges app-scoped products with catalog products for the same app and discriminator type.
 * App rows are applied first; catalog fills in any same-app, same-type products not already listed.
 */
export function mergeProductsForAppByType(
  appRows: unknown[],
  catalogRows: unknown[] | null,
  appId: string,
  canonicalTypeUpper: string,
): unknown[] {
  const map = new Map<string, unknown>()

  for (const raw of appRows) {
    if (!typeMatches(raw, canonicalTypeUpper)) continue
    const id = productRowId(raw)
    if (id) map.set(id, raw)
  }

  if (catalogRows && Array.isArray(catalogRows)) {
    for (const raw of catalogRows) {
      if (!typeMatches(raw, canonicalTypeUpper)) continue
      if (!catalogRowBelongsToApp(raw, appId)) continue
      const id = productRowId(raw)
      if (id && !map.has(id)) map.set(id, raw)
    }
  }

  return [...map.values()]
}

export function countMergedForAppType(
  appRows: unknown[],
  catalogRows: unknown[] | null,
  appId: string,
  canonicalTypeUpper: string,
): number {
  return mergeProductsForAppByType(appRows, catalogRows, appId, canonicalTypeUpper).length
}
